<script setup lang="ts">
import { ref, watch, inject, computed, type Ref } from 'vue'
import { useCommitStore } from '../composables/useCommitStore'
import { useAnimationEngine } from '../composables/useAnimationEngine'
import { getThemeVars } from '../utils/colors'
import type { Commit } from '../data/types'
import TreeView from './TreeView.vue'
import ParticleCanvas from './ParticleCanvas.vue'
import TimelineControl from './TimelineControl.vue'
import DetailPanel from './DetailPanel.vue'
import ThemePicker from './ThemePicker.vue'
import ExportDialog from './ExportDialog.vue'

const emit = defineEmits<{ 'new-project': [] }>()

const store = useCommitStore()
const currentTheme = inject<Ref<string>>('currentTheme')!

const treeViewRef = ref<InstanceType<typeof TreeView> | null>(null)
const particleRef = ref<InstanceType<typeof ParticleCanvas> | null>(null)
const showDetail = ref(false)
const showExport = ref(false)
const selectedCommitIndex = ref(0)

const engine = useAnimationEngine(store.totalCommits.value)

const commitsList = computed(() => store.commits.value as unknown as Commit[])
const currentCommit = computed(() => commitsList.value[selectedCommitIndex.value])
const currentSnapshot = computed(() => store.snapshots.value[selectedCommitIndex.value] ?? null)

// Sync engine total when data loads
watch(() => store.totalCommits.value, (n) => {
  engine.setTotal(n)
})

// When animation index changes, update tree + particles
watch([() => engine.currentIndex.value, () => engine.interProgress.value, () => store.snapshots.value.length], ([idx, progress]) => {
  if (store.snapshots.value.length === 0) return
  const svg = treeViewRef.value?.getSvgElement()
  const canvas = particleRef.value?.getCanvasElement()
  if (!svg || !canvas) return

  const snapshot = store.snapshots.value[idx]
  if (!snapshot) return

  if (!treeViewRef.value?.renderer) return
  treeViewRef.value.renderer.update(snapshot.tree, progress)

  if (!particleRef.value?.system) return
  const themeVars = getThemeVars()
  particleRef.value.system.setTheme(themeVars.particleColor, themeVars.particleCount)

  selectedCommitIndex.value = idx
}, { immediate: true })

// Watch theme changes to update renderer
watch(currentTheme, () => {
  if (!treeViewRef.value?.renderer) return
  const vars = getThemeVars()
  treeViewRef.value.renderer.setTheme({
    treeBranch: vars.treeBranch,
    treeLeaf: vars.treeLeaf,
    treeAdded: vars.treeAdded,
    treeDeleted: vars.treeDeleted,
    treeModified: vars.treeModified
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
  emit('new-project')
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
      @close="showExport = false"
    />
    <div class="top-actions">
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
</style>