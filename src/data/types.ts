export type FileStatus = 'added' | 'deleted' | 'modified'

export interface FileChange {
  path: string
  status: FileStatus
  additions: number
  deletions: number
}

export interface Commit {
  hash: string
  author: string
  email: string
  date: string
  message: string
  branches: string[]
  parents: string[]
  files: FileChange[]
  /** Computed: files where status === 'added' */
  addedFiles?: string[]
  /** Computed: files where status === 'deleted' */
  deletedFiles?: string[]
  /** Computed: files where status === 'modified' */
  modifiedFiles?: string[]
}

export interface BranchNode {
  name: string
  commitHashes: string[]
  color: string
  parentBranch?: string
}

export interface TreeNode {
  name: string
  path: string
  type: 'blob' | 'tree'
  status?: FileStatus
  children?: TreeNode[]
  /** Animation progress 0..1 for this node */
  progress?: number
  /** Whether this node is newly added in current commit */
  isNew?: boolean
  /** Whether this node is deleted in current commit */
  isDeleted?: boolean
  /** Whether this node is modified in current commit */
  isModified?: boolean
  /** Unique id for D3 keying */
  id: string
}

export interface CommitSnapshot {
  commitIndex: number
  commit: Commit
  tree: TreeNode
  cumulativeFiles: string[]
}

export interface ThemeColors {
  name: string
  label: string
  background: string
  treeBranch: string
  treeLeaf: string
  treeAdded: string
  treeDeleted: string
  treeModified: string
  textPrimary: string
  textSecondary: string
  accent: string
  particleColor: string
  particleCount: number
  controlBg: string
}

export interface AnimationState {
  isPlaying: boolean
  speed: number
  currentIndex: number
  /** 0..1 interpolation between currentIndex and currentIndex+1 */
  interProgress: number
  totalCommits: number
}

export type ExportMode = 'quick' | 'high'

export interface DataSource {
  type: 'github' | 'paste' | 'sample'
  value: string
}