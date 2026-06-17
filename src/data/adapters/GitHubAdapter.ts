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

/**
 * Fetch commits from the GitHub REST API (public repos, no auth needed).
 * Rate-limited to 60 requests/hour for unauthenticated requests.
 *
 * Strategy: the /commits list endpoint does NOT include file details.
 * We fetch individual commit details sequentially (with delay) to avoid
 * rate limits and gateway timeouts. On repeated failures we degrade to
 * commits with empty file lists.
 */
export async function fetchGitHubCommits(
  owner: string,
  repo: string,
  options: GitHubFetchOptions = {}
): Promise<Commit[]> {
  const { since, until, maxCommits = 80 } = options
  const perPage = 100
  const allCommits: Commit[] = []

  // Phase 1: fetch the commit list (no files yet)
  const commitListItems: GitHubCommitData[] = []

  for (let page = 1; commitListItems.length < maxCommits; page++) {
    const params = new URLSearchParams({
      per_page: String(perPage),
      page: String(page)
    })
    if (since) params.set('since', since.toISOString())
    if (until) params.set('until', until.toISOString())

    const res = await githubFetch(`/repos/${owner}/${repo}/commits?${params}`)

    if (res.status === 403 || res.status === 429) {
      throw new Error('GitHub API 限流，请缩小日期范围或稍后再试')
    }
    if (!res.ok) {
      throw new Error(`GitHub API error: ${res.status} ${res.statusText}`)
    }

    const data: GitHubCommitData[] = await res.json()
    if (!data.length) break
    commitListItems.push(...data.slice(0, maxCommits - commitListItems.length))
    if (data.length < perPage) break
  }

  if (!commitListItems.length) return []

  // Phase 2: fetch file details one-by-one to stay within rate limits.
  let consecutiveFailures = 0
  let detailSkipped = false

  for (let i = 0; i < commitListItems.length; i++) {
    const item = commitListItems[i]
    let files: FileChange[] = []

    if (!detailSkipped) {
      if (i > 0) await sleep(DETAIL_DELAY_MS)

      try {
        const res = await githubFetch(`/repos/${owner}/${repo}/commits/${item.sha}`)

        if (res.status === 403 || res.status === 429) {
          detailSkipped = true
        } else if (res.ok) {
          const detail: GitHubCommitData = await res.json()
          files = mapFiles(detail.files)
          consecutiveFailures = 0
        } else {
          consecutiveFailures++
          if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) detailSkipped = true
        }
      } catch {
        consecutiveFailures++
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) detailSkipped = true
      }
    }

    allCommits.push(toCommit(item, files))
  }

  return allCommits.reverse() // oldest first
}
