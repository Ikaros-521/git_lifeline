<script setup lang="ts">
import { ref, watch, inject, computed, nextTick, type Ref } from 'vue'
import { useCommitStore } from '../composables/useCommitStore'
import { useAnimationEngine } from '../composables/useAnimationEngine'
import { getThemeVars } from '../utils/colors'
import type { Commit, PathFilter } from '../data/types'
import type { BurstPoint } from '../engine/TreeRenderer'
import TreeView from './TreeView.vue'
import ParticleCanvas from './ParticleCanvas.vue'
import TimelineControl from './TimelineControl.vue'
import DetailPanel from './DetailPanel.vue'
import ThemePicker from './ThemePicker.vue'
import ExportDialog from './ExportDialog.vue'
import PathFilterPanel from './PathFilterPanel.vue'
import type { CompositeSources } from '../utils/frameCompositor'
import { EXPORT_FPS, type ExportDriver } from '../utils/videoExporter'

const emit = defineEmits<{ 'new-project': [] }>()

const store = useCommitStore()
const currentTheme = inject<Ref<string>>('currentTheme')!

const treeViewRef = ref<InstanceType<typeof TreeView> | null>(null)
const particleRef = ref<InstanceType<typeof ParticleCanvas> | null>(null)
const showDetail = ref(false)
const showExport = ref(false)
const showPathFilter = ref(false)
const selectedCommitIndex = ref(0)

const engine = useAnimationEngine(store.totalCommits.value)

const commitsList = computed(() => store.commits.value as unknown as Commit[])
const currentCommit = computed(() => commitsList.value[selectedCommitIndex.value])
const currentSnapshot = computed(() => store.snapshots.value[selectedCommitIndex.value] ?? null)

// Fire particle bursts for the change points reported by the tree renderer.
function handleBurst(points: BurstPoint[]) {
  const canvas = particleRef.value
  if (!canvas) return
  const vars = getThemeVars()
  const colorFor = (kind: BurstPoint['kind']) =>
    kind === 'added' ? vars.treeAdded
      : kind === 'deleted' ? vars.treeDeleted
        : vars.treeModified
  for (const pt of points) {
    // Deletions get a denser, more violent burst for impact.
    const n = pt.kind === 'deleted' ? 24 : pt.kind === 'added' ? 18 : 12
    canvas.burst(pt.x, pt.y, colorFor(pt.kind), n)
  }
}

// Watch data + renderer ready state to trigger initial render
const readyToRender = computed(() =>
  store.snapshots.value.length > 0 && treeViewRef.value?.renderer != null
)

watch(readyToRender, (ready) => {
  if (!ready) return
  // Register burst callback now that the renderer exists.
  treeViewRef.value!.renderer!.setOnBurst(handleBurst)
  const idx = engine.currentIndex.value
  const snapshot = store.snapshots.value[idx]
  if (!snapshot) return
  treeViewRef.value!.renderer!.update(snapshot.tree, engine.interProgress.value, idx)
  const themeVars = getThemeVars()
  particleRef.value?.system?.setTheme(themeVars.particleColor, themeVars.particleCount)
  selectedCommitIndex.value = idx
  console.log('[GitLifeline] initial render', idx, snapshot.commit.hash, snapshot.commit.files.length)
})

const filterSummary = computed(() => {
  if (!store.filterActive.value) return null
  const hidden = store.filteredOutCommits.value
  if (store.totalCommits.value === 0) return '路径筛选后没有可展示的提交'
  if (hidden > 0) return `路径筛选中 · 已隐藏 ${hidden} 个提交`
  return '路径筛选已启用'
})

// Sync engine total when data loads or filter changes
watch(() => store.totalCommits.value, (n) => {
  engine.setTotal(n)
  if (engine.currentIndex.value >= n) {
    engine.seek(Math.max(0, n - 1))
  }
})

// When animation index/progress changes (playback), update tree + particles
watch([() => engine.currentIndex.value, () => engine.interProgress.value], ([idx, progress]) => {
  if (store.snapshots.value.length === 0) return
  const snapshot = store.snapshots.value[idx]
  if (!snapshot) return
  if (!treeViewRef.value?.renderer) return
  treeViewRef.value.renderer.update(snapshot.tree, progress, idx)
  selectedCommitIndex.value = idx
})

// Watch theme changes to update renderer
watch(currentTheme, () => {
  if (!treeViewRef.value?.renderer) return
  const vars = getThemeVars()
  treeViewRef.value.renderer.setTheme({
    treeBranch: vars.treeBranch,
    treeLeaf: vars.treeLeaf,
    treeAdded: vars.treeAdded,
    treeDeleted: vars.treeDeleted,
    treeModified: vars.treeModified,
    treeNodeStroke: vars.treeNodeStroke,
    treeLabelColor: vars.treeLabelColor,
    treeLabelOutline: vars.treeLabelOutline,
    treeLabelAdded: vars.treeLabelAdded,
    treeLabelDeleted: vars.treeLabelDeleted,
    treeLabelModified: vars.treeLabelModified
  })
})

function onSeek(index: number) {
  engine.seek(index)
}

function onTogglePlay() {
  engine.togglePlay()
}

function onNext() {
  engine.next()
}

function onPrev() {
  engine.prev()
}

function onSpeedChange(speed: number) {
  engine.setSpeed(speed)
}

function onNewProject() {
  store.resetPathFilter()
  emit('new-project')
}

function onApplyPathFilter(filter: PathFilter) {
  store.setPathFilter(filter)
  showPathFilter.value = false
  engine.pause()
  engine.seek(0)
  selectedCommitIndex.value = 0
  nextTick(() => {
    const snapshot = store.snapshots.value[0]
    if (snapshot && treeViewRef.value?.renderer) {
      treeViewRef.value.renderer.update(snapshot.tree, 0, 0)
    }
  })
}

function getExportSources(): CompositeSources | null {
  const particleCanvas = particleRef.value?.getCanvasElement()
  const svg = treeViewRef.value?.getSvgElement()
  if (!particleCanvas || !svg) return null
  return {
    particleCanvas,
    svg,
    width: particleCanvas.clientWidth,
    height: particleCanvas.clientHeight
  }
}

function createExportDriver(): ExportDriver {
  const saved = {
    index: engine.currentIndex.value,
    progress: engine.interProgress.value,
    playing: engine.isPlaying.value
  }

  engine.pause()
  particleRef.value?.system?.pause()

  let index = 0
  let progress = 0
  const EASE_DURATION = 500
  const progressStep = (1 / EXPORT_FPS) / (EASE_DURATION / 1000) * engine.speed.value
  const total = store.totalCommits.value

  function stepFrame() {
    progress += progressStep
    if (progress >= 1) {
      if (index < total - 1) {
        progress = 0
        index++
      } else {
        progress = 1
      }
    }

    engine.currentIndex.value = index
    engine.interProgress.value = progress
    selectedCommitIndex.value = index

    const snapshot = store.snapshots.value[index]
    if (snapshot && treeViewRef.value?.renderer) {
      treeViewRef.value.renderer.update(snapshot.tree, progress, index)
    }
    particleRef.value?.system?.step(1 / EXPORT_FPS)
  }

  function cleanup() {
    particleRef.value?.system?.resume()
    engine.pause()
    engine.seek(saved.index)
    engine.interProgress.value = saved.progress
    if (saved.playing) engine.play()
  }

  return { stepFrame, cleanup }
}
</script>

<template>
  <div class="git-lifeline">
    <TreeView ref="treeViewRef" />
    <ParticleCanvas ref="particleRef" />
    <TimelineControl
      :current-index="engine.currentIndex.value"
      :total-commits="store.totalCommits.value"
      :is-playing="engine.isPlaying.value"
      :speed="engine.speed.value"
      :commits="commitsList"
      @seek="onSeek"
      @toggle-play="onTogglePlay"
      @next="onNext"
      @prev="onPrev"
      @speed-change="onSpeedChange"
    />
    <DetailPanel
      v-if="showDetail"
      :commit="currentCommit"
      :snapshot="currentSnapshot"
      @close="showDetail = false"
    />
    <ThemePicker />
    <ExportDialog
      v-if="showExport"
      :get-sources="getExportSources"
      :create-export-driver="createExportDriver"
      @close="showExport = false"
    />
    <PathFilterPanel
      v-if="showPathFilter"
      :filter="store.pathFilter.value"
      :raw-total="store.rawTotalCommits.value"
      :filtered-total="store.totalCommits.value"
      @apply="onApplyPathFilter"
      @close="showPathFilter = false"
    />
    <div class="top-actions">
      <button
        class="action-btn"
        :class="{ active: store.filterActive.value }"
        @click="showPathFilter = true"
        title="路径筛选"
      >
        🔍
      </button>
      <button class="action-btn" @click="showDetail = !showDetail" title="详情">
        📋
      </button>
      <button class="action-btn" @click="showExport = true" title="导出视频">
        📹
      </button>
      <button class="action-btn" @click="onNewProject" title="新建项目">
        📂
      </button>
    </div>
    <div v-if="filterSummary" class="filter-banner">
      {{ filterSummary }}
    </div>
    <div v-if="store.warning.value" class="warning-banner">
      ⚠️ {{ store.warning.value }}
    </div>
  </div>
</template>

<style scoped>
.git-lifeline {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--theme-bg);
}

.top-actions {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  gap: 8px;
  z-index: 20;
}

.action-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--theme-text-secondary);
  background: var(--theme-control-bg);
  color: var(--theme-text-primary);
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.action-btn:hover {
  border-color: var(--theme-accent);
  background: var(--theme-accent);
  color: #fff;
}

.action-btn.active {
  border-color: var(--theme-accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--theme-accent) 35%, transparent);
}

.filter-banner {
  position: absolute;
  top: 64px;
  left: 50%;
  transform: translateX(-50%);
  max-width: min(480px, calc(100% - 32px));
  padding: 8px 14px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--theme-accent) 18%, transparent);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 55%, transparent);
  color: var(--theme-text-primary);
  font-size: 12px;
  z-index: 25;
  text-align: center;
  backdrop-filter: blur(6px);
}

.warning-banner {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  max-width: min(640px, calc(100% - 32px));
  padding: 10px 16px;
  border-radius: 8px;
  background: rgba(251, 191, 36, 0.15);
  border: 1px solid #f59e0b;
  color: #fbbf24;
  font-size: 13px;
  line-height: 1.5;
  z-index: 25;
  text-align: center;
  backdrop-filter: blur(6px);
}
</style>