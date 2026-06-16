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

const DEFAULT_HEADERS = {
  'Accept': 'application/vnd.github.v3+json',
  'User-Agent': 'git-lifeline/1.0'
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

/**
 * Fetch commits from the GitHub REST API (public repos, no auth needed).
 * Rate-limited to 60 requests/hour for unauthenticated requests.
 *
 * Strategy: the /commits list endpoint does NOT include file details.
 * We try to fetch individual commit details for files, but gracefully
 * degrade when rate-limited (returns commits with empty file lists).
 */
export async function fetchGitHubCommits(
  owner: string,
  repo: string,
  maxCommits: number = 100
): Promise<Commit[]> {
  const perPage = Math.min(maxCommits, 100)
  const pages = Math.ceil(maxCommits / perPage)
  const allCommits: Commit[] = []

  // Phase 1: fetch the commit list (no files yet)
  const commitListItems: GitHubCommitData[] = []

  for (let page = 1; page <= pages; page++) {
    const url = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=${perPage}&page=${page}`
    const res = await fetch(url, { headers: DEFAULT_HEADERS })

    if (!res.ok) {
      throw new Error(`GitHub API error: ${res.status} ${res.statusText}`)
    }

    const data: GitHubCommitData[] = await res.json()
    if (!data.length) break
    commitListItems.push(...data)
  }

  // Phase 2: try to fetch individual commit details in small batches
  // to get the files array. Silently skip on 403/rate-limit.
  const BATCH_SIZE = 3

  for (let i = 0; i < commitListItems.length; i += BATCH_SIZE) {
    const batch = commitListItems.slice(i, i + BATCH_SIZE)
    const results = await Promise.allSettled(
      batch.map(item =>
        fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${item.sha}`, {
          headers: DEFAULT_HEADERS
        }).then(res => {
          if (!res.ok) throw new Error(`GitHub API error: ${res.status}`)
          return res.json() as Promise<GitHubCommitData>
        })
      )
    )

    for (let j = 0; j < results.length; j++) {
      const item = batch[j]
      const result = results[j]

      let files: FileChange[] = []

      if (result.status === 'fulfilled' && result.value.files) {
        files = result.value.files.map(f => ({
          path: f.filename,
          status: f.status === 'removed' ? 'deleted' : (f.status === 'added' ? 'added' : 'modified'),
          additions: f.additions,
          deletions: f.deletions
        }))
      }

      allCommits.push({
        hash: item.sha,
        author: item.commit.author.name,
        email: item.commit.author.email,
        date: item.commit.author.date,
        message: item.commit.message,
        branches: [],
        parents: item.parents.map(p => p.sha),
        files
      })
    }
  }

  return allCommits.reverse() // oldest first
}