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

    const branchesMatch = block.match(/^Branches:\s+(.+)$/m)
    const branches = branchesMatch ? branchesMatch[1].split(/,\s*/).filter(Boolean) : []

    const messageLines: string[] = []
    const msgSection = block.split(/^Date:\s+.+$/m)[1] ?? ''
    const msgLines = msgSection.split('\n')
    let inMsg = false
    let inFiles = false
    const files: FileChange[] = []

    for (const line of msgLines) {
      const trimmed = line.trim()

      if (!inMsg && trimmed.startsWith('commit ')) continue
      if (trimmed.startsWith('Author:')) continue
      if (trimmed.startsWith('Branches:')) continue

      if (!inMsg && trimmed === '') {
        inMsg = true
        continue
      }

      if (inMsg && !inFiles) {
        if (trimmed === '') {
          inFiles = true
          continue
        }
        messageLines.push(trimmed)
        continue
      }

      if (inFiles && trimmed) {
        const fileMatch = trimmed.match(/^([AMDR])\t(.+)$/)
        if (fileMatch) {
          const statusMap: Record<string, FileStatus> = {
            A: 'added',
            M: 'modified',
            D: 'deleted',
            R: 'modified'
          }
          files.push({
            path: fileMatch[2],
            status: statusMap[fileMatch[1]] ?? 'modified',
            additions: 0,
            deletions: 0
          })
        }
      }
    }

    commits.push({
      hash,
      author,
      email,
      date,
      message: messageLines.join('\n').trim(),
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

/**
 * Build a git log command hint for users.
 */
export function getGitLogHint(): string {
  return `git log --all --stat --name-status --date=iso --format="commit %H%nAuthor: %an <%ae>%nDate:   %ad%nBranches: %d%n%n  %s%n%n%b" --no-color`
}