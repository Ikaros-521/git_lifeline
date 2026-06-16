import type { Commit, BranchNode } from './types'

/** Generate a simulated commit history for demo purposes.
 *  This mimics a real project's growth so users can try the app immediately. */
export function getSampleCommits(): { commits: Commit[]; branches: BranchNode[] } {
  const commits: Commit[] = [
    {
      hash: 'a1b2c3d',
      author: 'Alice',
      email: 'alice@example.com',
      date: '2025-01-01T10:00:00Z',
      message: 'feat: initial project setup',
      branches: ['main'],
      parents: [],
      files: [
        { path: 'package.json', status: 'added', additions: 30, deletions: 0 },
        { path: 'src/main.ts', status: 'added', additions: 15, deletions: 0 },
        { path: 'src/utils/helpers.ts', status: 'added', additions: 40, deletions: 0 },
        { path: 'tsconfig.json', status: 'added', additions: 20, deletions: 0 },
        { path: 'README.md', status: 'added', additions: 10, deletions: 0 }
      ]
    },
    {
      hash: 'b2c3d4e',
      author: 'Alice',
      email: 'alice@example.com',
      date: '2025-01-03T14:00:00Z',
      message: 'feat: add core module',
      branches: ['main'],
      parents: ['a1b2c3d'],
      files: [
        { path: 'src/core/engine.ts', status: 'added', additions: 120, deletions: 0 },
        { path: 'src/core/index.ts', status: 'added', additions: 5, deletions: 0 },
        { path: 'src/utils/helpers.ts', status: 'modified', additions: 10, deletions: 2 }
      ]
    },
    {
      hash: 'c3d4e5f',
      author: 'Bob',
      email: 'bob@example.com',
      date: '2025-01-05T09:00:00Z',
      message: 'feat: add UI components',
      branches: ['main'],
      parents: ['b2c3d4e'],
      files: [
        { path: 'src/components/Button.tsx', status: 'added', additions: 60, deletions: 0 },
        { path: 'src/components/Modal.tsx', status: 'added', additions: 100, deletions: 0 },
        { path: 'src/core/engine.ts', status: 'modified', additions: 20, deletions: 5 }
      ]
    },
    {
      hash: 'd4e5f6g',
      author: 'Alice',
      email: 'alice@example.com',
      date: '2025-01-08T16:00:00Z',
      message: 'refactor: remove deprecated helpers',
      branches: ['main'],
      parents: ['c3d4e5f'],
      files: [
        { path: 'src/utils/helpers.ts', status: 'deleted', additions: 0, deletions: 48 }
      ]
    },
    {
      hash: 'e5f6g7h',
      author: 'Bob',
      email: 'bob@example.com',
      date: '2025-01-10T11:00:00Z',
      message: 'feat: add tests and CI',
      branches: ['main', 'ci'],
      parents: ['d4e5f6g'],
      files: [
        { path: 'tests/core.test.ts', status: 'added', additions: 80, deletions: 0 },
        { path: 'tests/components/Button.test.ts', status: 'added', additions: 50, deletions: 0 },
        { path: '.github/workflows/ci.yml', status: 'added', additions: 25, deletions: 0 },
        { path: 'src/core/engine.ts', status: 'modified', additions: 5, deletions: 3 }
      ]
    },
    {
      hash: 'f6g7h8i',
      author: 'Charlie',
      email: 'charlie@example.com',
      date: '2025-01-12T08:00:00Z',
      message: 'feat: add API layer',
      branches: ['main'],
      parents: ['e5f6g7h'],
      files: [
        { path: 'src/api/client.ts', status: 'added', additions: 90, deletions: 0 },
        { path: 'src/api/endpoints.ts', status: 'added', additions: 70, deletions: 0 },
        { path: 'src/api/types.ts', status: 'added', additions: 35, deletions: 0 }
      ]
    },
    {
      hash: 'g7h8i9j',
      author: 'Alice',
      email: 'alice@example.com',
      date: '2025-01-15T13:00:00Z',
      message: 'feat: add database layer',
      branches: ['main'],
      parents: ['f6g7h8i'],
      files: [
        { path: 'src/db/schema.ts', status: 'added', additions: 110, deletions: 0 },
        { path: 'src/db/migrations/001_init.ts', status: 'added', additions: 45, deletions: 0 },
        { path: 'src/db/index.ts', status: 'added', additions: 20, deletions: 0 },
        { path: 'src/api/client.ts', status: 'modified', additions: 15, deletions: 8 }
      ]
    },
    {
      hash: 'h8i9j0k',
      author: 'Bob',
      email: 'bob@example.com',
      date: '2025-01-20T10:00:00Z',
      message: 'refactor: split engine into modules',
      branches: ['main'],
      parents: ['g7h8i9j'],
      files: [
        { path: 'src/core/engine.ts', status: 'deleted', additions: 0, deletions: 150 },
        { path: 'src/core/parser.ts', status: 'added', additions: 60, deletions: 0 },
        { path: 'src/core/runner.ts', status: 'added', additions: 80, deletions: 0 },
        { path: 'src/core/types.ts', status: 'added', additions: 30, deletions: 0 }
      ]
    }
  ]

  const branches: BranchNode[] = [
    { name: 'main', commitHashes: ['a1b2c3d', 'b2c3d4e', 'c3d4e5f', 'd4e5f6g', 'e5f6g7h', 'f6g7h8i', 'g7h8i9j', 'h8i9j0k'], color: '#4ade80' },
    { name: 'ci', commitHashes: ['e5f6g7h'], color: '#f59e0b', parentBranch: 'main' }
  ]

  return { commits, branches }
}