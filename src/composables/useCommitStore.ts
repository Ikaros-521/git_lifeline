import { ref, computed } from 'vue'
import type { Commit, BranchNode, TreeNode, CommitSnapshot } from '../data/types'
import { getSampleCommits } from '../data/sampleData'
import { parseGitLog } from '../data/adapters/GitLogParser'
import {
  fetchGitHubCommits,
  parseGitHubUrl,
  type GitHubFetchOptions,
  type GitHubProgressLog
} from '../data/adapters/GitHubAdapter'

/** Build a hierarchical tree from a set of file paths at a given commit snapshot. */
function buildTreeFromFiles(files: string[], newFiles: Set<string>, deletedFiles: Set<string>, modifiedFiles: Set<string>): TreeNode {
  const root: TreeNode = {
    name: '/',
    path: '',
    type: 'tree',
    children: [],
    id: 'root'
  }

  for (const filePath of files) {
    const parts = filePath.split('/')
    let current = root

    for (let i = 0; i < parts.length; i++) {
      const isFile = i === parts.length - 1
      const partPath = parts.slice(0, i + 1).join('/')
      let child = current.children?.find(c => c.name === parts[i])

      if (!child) {
        child = {
          name: parts[i],
          path: partPath,
          type: isFile ? 'blob' : 'tree',
          children: isFile ? undefined : [],
          progress: 0,
          id: partPath
        }
        current.children = current.children ?? []
        current.children.push(child)
      }

      if (isFile) {
        child.isNew = newFiles.has(filePath)
        child.isDeleted = deletedFiles.has(filePath)
        child.isModified = modifiedFiles.has(filePath)
        if (child.isNew) child.progress = 0
        else child.progress = 1
      }

      current = child
    }
  }

  return root
}

/** Module-level singleton state */
const commits = ref<Commit[]>([])
const branches = ref<BranchNode[]>([])
const snapshots = ref<CommitSnapshot[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const warning = ref<string | null>(null)
const fetchLogs = ref<GitHubProgressLog[]>([])

export function useCommitStore() {
  const totalCommits = computed(() => commits.value.length)
  const hasData = computed(() => commits.value.length > 0)

  /** Load sample demo data */
  function loadSample() {
    const data = getSampleCommits()
    commits.value = data.commits
    branches.value = data.branches
    error.value = null
    warning.value = null
    fetchLogs.value = []
    buildSnapshots()
  }

  /** Parse pasted git log text */
  function loadFromPaste(raw: string) {
    try {
      commits.value = parseGitLog(raw)
      branches.value = inferBranches(commits.value)
      error.value = null
      warning.value = null
      fetchLogs.value = []
      buildSnapshots()
    } catch (e) {
      error.value = `解析失败: ${e instanceof Error ? e.message : String(e)}`
    }
  }

  /** Load from GitHub API */
  async function loadFromGitHub(url: string, options?: GitHubFetchOptions) {
    const parsed = parseGitHubUrl(url)
    if (!parsed) {
      error.value = '无效的 GitHub 仓库 URL'
      return
    }
    loading.value = true
    error.value = null
    warning.value = null
    fetchLogs.value = []
    try {
      const result = await fetchGitHubCommits(parsed.owner, parsed.repo, {
        ...options,
        onProgress: (log) => {
          fetchLogs.value = [...fetchLogs.value, log]
        }
      })
      commits.value = result.commits
      branches.value = inferBranches(commits.value)

      if (result.warnings.length) {
        warning.value = result.warnings.join('；')
      }

      if (commits.value.length === 0) {
        error.value = '未获取到任何提交，请检查仓库 URL 或缩小/调整日期范围'
      } else {
        buildSnapshots()
      }
    } catch (e) {
      error.value = `加载失败: ${e instanceof Error ? e.message : String(e)}`
    } finally {
      loading.value = false
    }
  }

  /** Build tree snapshots for each commit */
  function buildSnapshots() {
    const cumulative = new Set<string>()
    const snap: CommitSnapshot[] = []
    // Files deleted in the *previous* commit, removed at the start of this one
    // so the deleted node stays visible for one full snapshot and can fade out.
    let pendingRemovals: string[] = []

    for (let i = 0; i < commits.value.length; i++) {
      const commit = commits.value[i]
      const newFiles = new Set<string>()
      const deletedFiles = new Set<string>()
      const modifiedFiles = new Set<string>()

      // Retire files that were marked deleted in the previous snapshot.
      for (const path of pendingRemovals) cumulative.delete(path)
      pendingRemovals = []

      for (const file of commit.files) {
        if (file.status === 'added') {
          cumulative.add(file.path)
          newFiles.add(file.path)
        } else if (file.status === 'deleted') {
          // Keep the file in the tree this snapshot so it can animate out,
          // then schedule its removal for the next commit.
          deletedFiles.add(file.path)
          pendingRemovals.push(file.path)
        } else if (file.status === 'modified') {
          modifiedFiles.add(file.path)
        }
      }

      snap.push({
        commitIndex: i,
        commit,
        tree: buildTreeFromFiles(
          Array.from(cumulative),
          newFiles,
          deletedFiles,
          modifiedFiles
        ),
        cumulativeFiles: Array.from(cumulative)
      })
    }

    snapshots.value = snap
  }

  return {
    commits,
    branches,
    snapshots,
    loading,
    error,
    warning,
    fetchLogs,
    totalCommits,
    hasData,
    loadSample,
    loadFromPaste,
    loadFromGitHub
  }
}

/** Infer branch structure from commits */
function inferBranches(commits: Commit[]): BranchNode[] {
  const branchMap = new Map<string, string[]>()
  for (const c of commits) {
    for (const b of c.branches) {
      if (!branchMap.has(b)) branchMap.set(b, [])
      branchMap.get(b)!.push(c.hash)
    }
  }
  return Array.from(branchMap.entries()).map(([name, hashes], i) => ({
    name,
    commitHashes: hashes,
    color: BRANCH_COLORS[i % BRANCH_COLORS.length]
  }))
}

const BRANCH_COLORS = ['#4ade80', '#f59e0b', '#60a5fa', '#f472b6', '#a78bfa']