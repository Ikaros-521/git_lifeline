import type { Commit, PathFilter, PathFilterMode } from '../data/types'

export type { PathFilter, PathFilterMode }

export const DEFAULT_PATH_FILTER: PathFilter = {
  mode: 'none',
  patternsText: ''
}

/** Parse textarea into non-empty patterns (lines starting with # are comments). */
export function parsePathPatterns(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
}

function escapeRegexChar(ch: string): string {
  return ch.replace(/[.+^${}()|[\]\\]/g, '\\$&')
}

/** Convert a simple glob pattern to a RegExp anchored to the full path. */
function globToRegex(glob: string): RegExp {
  let regex = '^'
  let i = 0
  while (i < glob.length) {
    const ch = glob[i]
    if (ch === '*' && glob[i + 1] === '*') {
      if (glob[i + 2] === '/') {
        regex += '(?:.*/)?'
        i += 3
      } else {
        regex += '.*'
        i += 2
      }
    } else if (ch === '*') {
      regex += '[^/]*'
      i++
    } else if (ch === '?') {
      regex += '[^/]'
      i++
    } else {
      regex += escapeRegexChar(ch)
      i++
    }
  }
  regex += '$'
  return new RegExp(regex)
}

/** Whether a file path matches a single user pattern. */
export function matchesPathPattern(path: string, pattern: string): boolean {
  const normalizedPath = path.replace(/\\/g, '/')
  const normalizedPattern = pattern.replace(/\\/g, '/').trim()
  if (!normalizedPattern) return false

  if (/[*?]/.test(normalizedPattern)) {
    return globToRegex(normalizedPattern).test(normalizedPath)
  }

  if (normalizedPattern.endsWith('/')) {
    const prefix = normalizedPattern.slice(0, -1)
    return normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`)
  }

  return normalizedPath === normalizedPattern
    || normalizedPath.startsWith(`${normalizedPattern}/`)
}

/** Whether a path is included given the current filter mode. */
export function pathMatchesFilter(path: string, filter: PathFilter): boolean {
  const patterns = parsePathPatterns(filter.patternsText)
  if (filter.mode === 'none' || patterns.length === 0) return true

  const matchesAny = patterns.some(p => matchesPathPattern(path, p))
  return filter.mode === 'whitelist' ? matchesAny : !matchesAny
}

function withFilteredFiles(commit: Commit, filter: PathFilter): Commit {
  const files = commit.files.filter(f => pathMatchesFilter(f.path, filter))
  return {
    ...commit,
    files,
    addedFiles: files.filter(f => f.status === 'added').map(f => f.path),
    deletedFiles: files.filter(f => f.status === 'deleted').map(f => f.path),
    modifiedFiles: files.filter(f => f.status === 'modified').map(f => f.path)
  }
}

/** Apply path filter to commits; drops commits with no matching file changes. */
export function applyPathFilter(commits: Commit[], filter: PathFilter): Commit[] {
  const patterns = parsePathPatterns(filter.patternsText)
  if (filter.mode === 'none' || patterns.length === 0) return commits

  return commits
    .map(c => withFilteredFiles(c, filter))
    .filter(c => c.files.length > 0)
}

export function isPathFilterActive(filter: PathFilter): boolean {
  return filter.mode !== 'none' && parsePathPatterns(filter.patternsText).length > 0
}
