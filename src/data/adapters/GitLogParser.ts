import type { Commit, FileChange, FileStatus } from '../types'

/**
 * Parses the output of `git log --stat --name-status --date=iso` into Commit objects.
 *
 * Expected input format per commit:
 *   commit <hash>
 *   Author: <name> <<email>>
 *   Date:   <ISO date>
 *   Branches: <branch1, branch2...>
 *
 *       <message line 1>
 *       <message line 2...>
 *
 *   A\tsrc/file/added.ts
 *   M\tsrc/file/modified.ts
 *   D\tsrc/file/deleted.ts
 *
 *   <blank line between commits>
 */
export function parseGitLog(raw: string): Commit[] {
  const commits: Commit[] = []
  const blocks = raw.trim().split(/(?=^commit\s+)/m)

  for (const block of blocks) {
    if (!block.trim()) continue

    const hashMatch = block.match(/^commit\s+(\S+)/m)
    if (!hashMatch) continue
    const hash = hashMatch[1]

    const authorMatch = block.match(/^Author:\s+(.+?)(?:\s+<(.+?)>)?\s*$/m)
    const author = authorMatch?.[1] ?? 'Unknown'
    const email = authorMatch?.[2] ?? ''

    const dateMatch = block.match(/^Date:\s+(.+)$/m)
    const date = dateMatch?.[1]?.trim() ?? ''

    const branches = parseBranchDecorations(
      block.match(/^Branches:[ \t]*([^\n]*)$/m)?.[1] ?? ''
    )

    const afterBranches = block.split(/^Branches:.*$/m)[1] ?? ''
    const fileLineIndex = afterBranches.search(/^[AMDR]\t/m)
    const messageSection =
      fileLineIndex >= 0 ? afterBranches.slice(0, fileLineIndex) : afterBranches
    const message = messageSection
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .join('\n')

    const files: FileChange[] = []
    const fileSection = fileLineIndex >= 0 ? afterBranches.slice(fileLineIndex) : ''
    for (const line of fileSection.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed) continue
      const fileMatch = trimmed.match(/^([AMDR])\t(.+)$/)
      if (fileMatch) {
        const statusMap: Record<string, FileStatus> = {
          A: 'added',
          M: 'modified',
          D: 'deleted',
          R: 'modified',
        }
        files.push({
          path: fileMatch[2],
          status: statusMap[fileMatch[1]] ?? 'modified',
          additions: 0,
          deletions: 0,
        })
      }
    }

    commits.push({
      hash,
      author,
      email,
      date,
      message,
      branches,
      parents: [],
      files,
    })
  }

  // Infer parent relationships from commit order
  for (let i = 0; i < commits.length; i++) {
    if (i > 0) {
      commits[i].parents.push(commits[i - 1].hash)
    }
  }

  return commits.reverse() // oldest first
}

/** Parse git %d decorations, e.g. "(HEAD -> master, origin/master)" → ["master", "origin/master"] */
function parseBranchDecorations(raw: string): string[] {
  const trimmed = raw.trim()
  if (!trimmed) return []
  return trimmed
    .replace(/[()]/g, '')
    .split(',')
    .map((part) => part.replace(/HEAD\s*->\s*/i, '').trim())
    .filter(Boolean)
}

export type GitLogHintOptions = {
  since?: string
  until?: string
}

export type GitLogShell = 'powershell' | 'bash'

/** Relative --since values for common date presets. */
export const GIT_LOG_SINCE_PRESETS: Record<string, string> = {
  week: '1 week ago',
  month: '1 month ago',
  quarter: '3 months ago',
  halfYear: '6 months ago',
  year: '1 year ago',
}

const GIT_LOG_FORMAT = 'commit %H%nAuthor: %an <%ae>%nDate:   %ad%nBranches: %d%n%n  %s%n%n%b'

/** PowerShell prefix: git stdout is UTF-8 but PS decodes external programs as GBK by default. */
const POWERSHELL_UTF8_PREFIX =
  '[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); $OutputEncoding = [System.Text.UTF8Encoding]::new($false); '

/**
 * Build a git log command that exports to git-lifeline.log (UTF-8).
 * PowerShell: set console encoding then Out-File — plain `>` writes UTF-16,
 * and piping without the prefix decodes git output as GBK on Chinese Windows.
 */
export function getGitLogHint(options?: GitLogHintOptions, shell: GitLogShell = 'powershell'): string {
  if (shell === 'powershell') {
    const parts = [
      `${POWERSHELL_UTF8_PREFIX}git -c i18n.logOutputEncoding=UTF-8 log --all --name-status --date=iso`,
      `--format='${GIT_LOG_FORMAT}'`,
      '--no-color',
    ]
    if (options?.since) parts.push(`--since='${options.since}'`)
    if (options?.until) parts.push(`--until='${options.until}'`)
    return `${parts.join(' ')} | Out-File -Encoding utf8 git-lifeline.log`
  }

  const parts = [
    'git -c i18n.logOutputEncoding=utf-8 log --all --name-status --date=iso',
    `--format="${GIT_LOG_FORMAT}"`,
    '--no-color',
  ]
  if (options?.since) parts.push(`--since="${options.since}"`)
  if (options?.until) parts.push(`--until="${options.until}"`)
  return `${parts.join(' ')} > git-lifeline.log`
}