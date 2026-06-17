import type { Commit, FileChange } from '../types'

interface GitHubCommitFile {
  filename: string
  status: 'added' | 'modified' | 'removed'
  additions: number
  deletions: number
}

interface GitHubCommitData {
  sha: string
  commit: {
    author: { name: string; email: string; date: string }
    message: string
  }
  parents: Array<{ sha: string }>
  files?: GitHubCommitFile[]
}

/** Dev uses Vite proxy; production (GitHub Pages) calls GitHub API directly. */
const API_BASE = import.meta.env.DEV ? '/api/github' : 'https://api.github.com'

const DEFAULT_HEADERS = {
  Accept: 'application/vnd.github.v3+json',
  'User-Agent': 'git-lifeline/1.0'
}

const DETAIL_DELAY_MS = 250
const MAX_CONSECUTIVE_FAILURES = 3

export type GitHubLogLevel = 'info' | 'warn' | 'error'

export interface GitHubProgressLog {
  level: GitHubLogLevel
  message: string
  timestamp: number
}

export interface GitHubFetchResult {
  commits: Commit[]
  warnings: string[]
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function githubFetch(path: string, retries = 1): Promise<Response> {
  let lastError: unknown

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${API_BASE}${path}`, { headers: DEFAULT_HEADERS })
      if (res.status === 504 && attempt < retries) {
        await sleep(800)
        continue
      }
      return res
    } catch (err) {
      lastError = err
      if (attempt < retries) await sleep(800)
    }
  }

  throw lastError instanceof Error ? lastError : new Error('GitHub API request failed')
}

/**
 * Parse a GitHub repo URL into owner and repo name.
 * Supports: https://github.com/owner/repo, https://github.com/owner/repo.git
 */
export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/)
  if (!match) return null
  return { owner: match[1], repo: match[2].replace(/\.git$/, '') }
}

export interface GitHubFetchOptions {
  /** Only commits after this time (inclusive) */
  since?: Date
  /** Only commits before this time (inclusive) */
  until?: Date
  /** Safety cap on total commits fetched */
  maxCommits?: number
  /** Real-time progress callback */
  onProgress?: (log: GitHubProgressLog) => void
}

function mapFiles(files?: GitHubCommitFile[]): FileChange[] {
  if (!files?.length) return []
  return files.map(f => ({
    path: f.filename,
    status: f.status === 'removed' ? 'deleted' : (f.status === 'added' ? 'added' : 'modified'),
    additions: f.additions,
    deletions: f.deletions
  }))
}

function toCommit(item: GitHubCommitData, files: FileChange[] = []): Commit {
  return {
    hash: item.sha,
    author: item.commit.author.name,
    email: item.commit.author.email,
    date: item.commit.author.date,
    message: item.commit.message,
    branches: [],
    parents: item.parents.map(p => p.sha),
    files
  }
}

function shortSha(sha: string): string {
  return sha.slice(0, 7)
}

function shortMessage(message: string): string {
  const line = message.split('\n')[0].trim()
  return line.length > 40 ? `${line.slice(0, 40)}…` : line
}

/**
 * Fetch commits from the GitHub REST API (public repos, no auth needed).
 * Rate-limited to 60 requests/hour for unauthenticated requests.
 *
 * Strategy: the /commits list endpoint does NOT include file details.
 * We fetch individual commit details sequentially (with delay) to avoid
 * rate limits and gateway timeouts. On repeated failures we degrade to
 * commits with empty file lists and still return partial results.
 */
export async function fetchGitHubCommits(
  owner: string,
  repo: string,
  options: GitHubFetchOptions = {}
): Promise<GitHubFetchResult> {
  const { since, until, maxCommits = 80, onProgress } = options
  const perPage = 100
  const warnings: string[] = []
  const allCommits: Commit[] = []

  const log = (level: GitHubLogLevel, message: string) => {
    onProgress?.({ level, message, timestamp: Date.now() })
  }

  log('info', `开始获取 ${owner}/${repo} 的提交数据…`)

  // Phase 1: fetch the commit list (no files yet)
  const commitListItems: GitHubCommitData[] = []

  for (let page = 1; commitListItems.length < maxCommits; page++) {
    const params = new URLSearchParams({
      per_page: String(perPage),
      page: String(page)
    })
    if (since) params.set('since', since.toISOString())
    if (until) params.set('until', until.toISOString())

    log('info', `请求提交列表 · 第 ${page} 页…`)

    let res: Response
    try {
      res = await githubFetch(`/repos/${owner}/${repo}/commits?${params}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (commitListItems.length > 0) {
        const warn = `提交列表第 ${page} 页请求失败，将使用已获取的 ${commitListItems.length} 条提交`
        warnings.push(warn)
        log('warn', warn)
        break
      }
      log('error', `提交列表请求失败: ${msg}`)
      throw new Error(`提交列表请求失败: ${msg}`)
    }

    if (res.status === 403 || res.status === 429) {
      if (commitListItems.length > 0) {
        const warn = `GitHub API 限流，已获取 ${commitListItems.length} 条提交，将跳过剩余列表`
        warnings.push(warn)
        log('warn', warn)
        break
      }
      log('error', 'GitHub API 限流，请缩小日期范围或稍后再试')
      throw new Error('GitHub API 限流，请缩小日期范围或稍后再试')
    }

    if (!res.ok) {
      if (commitListItems.length > 0) {
        const warn = `提交列表返回 ${res.status}，将使用已获取的 ${commitListItems.length} 条提交`
        warnings.push(warn)
        log('warn', warn)
        break
      }
      log('error', `GitHub API 错误: ${res.status} ${res.statusText}`)
      throw new Error(`GitHub API error: ${res.status} ${res.statusText}`)
    }

    const data: GitHubCommitData[] = await res.json()
    if (!data.length) {
      log('info', page === 1 ? '该日期范围内没有提交' : `第 ${page} 页无更多提交`)
      break
    }

    const added = data.slice(0, maxCommits - commitListItems.length)
    commitListItems.push(...added)
    log('info', `第 ${page} 页获取 ${added.length} 条，累计 ${commitListItems.length} 条`)

    if (data.length < perPage) break
  }

  if (!commitListItems.length) {
    log('warn', '未获取到任何提交')
    return { commits: [], warnings }
  }

  // Phase 2: fetch file details one-by-one to stay within rate limits.
  let consecutiveFailures = 0
  let detailSkipped = false
  let detailsFetched = 0
  const total = commitListItems.length

  log('info', `开始获取文件变更详情（共 ${total} 条）…`)

  for (let i = 0; i < commitListItems.length; i++) {
    const item = commitListItems[i]
    let files: FileChange[] = []

    if (!detailSkipped) {
      if (i > 0) await sleep(DETAIL_DELAY_MS)

      log('info', `[${i + 1}/${total}] 获取 ${shortSha(item.sha)} · ${shortMessage(item.commit.message)}`)

      try {
        const res = await githubFetch(`/repos/${owner}/${repo}/commits/${item.sha}`)

        if (res.status === 403 || res.status === 429) {
          const warn = `详情请求触发限流（已完成 ${detailsFetched}/${total}），剩余提交将不含文件变更`
          if (!warnings.includes(warn)) warnings.push(warn)
          log('warn', warn)
          detailSkipped = true
        } else if (res.ok) {
          const detail: GitHubCommitData = await res.json()
          files = mapFiles(detail.files)
          detailsFetched++
          consecutiveFailures = 0
        } else {
          consecutiveFailures++
          log('warn', `[${i + 1}/${total}] 详情返回 ${res.status}，跳过文件变更`)
          if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            const warn = `连续 ${MAX_CONSECUTIVE_FAILURES} 次详情请求失败，剩余提交将不含文件变更`
            warnings.push(warn)
            log('warn', warn)
            detailSkipped = true
          }
        }
      } catch {
        consecutiveFailures++
        log('warn', `[${i + 1}/${total}] 详情请求网络错误`)
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          const warn = `连续 ${MAX_CONSECUTIVE_FAILURES} 次详情请求失败，剩余提交将不含文件变更`
          warnings.push(warn)
          log('warn', warn)
          detailSkipped = true
        }
      }
    }

    allCommits.push(toCommit(item, files))
  }

  if (detailsFetched < total && !detailSkipped && detailsFetched > 0) {
    const warn = `${total - detailsFetched} 条提交未获取到文件变更详情`
    warnings.push(warn)
    log('warn', warn)
  }

  log('info', `完成：共 ${allCommits.length} 条提交，${detailsFetched} 条含文件详情`)

  return { commits: allCommits.reverse(), warnings } // oldest first
}
