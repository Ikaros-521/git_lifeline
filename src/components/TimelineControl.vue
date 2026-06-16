<script setup lang="ts">
import { computed } from 'vue'
import type { Commit } from '../data/types'

const props = defineProps<{
  currentIndex: number
  totalCommits: number
  isPlaying: boolean
  speed: number
  commits: readonly Commit[]
}>()

const emit = defineEmits<{
  seek: [index: number]
  'toggle-play': []
  next: []
  prev: []
  'speed-change': [speed: number]
}>()

const progress = computed(() => {
  if (props.totalCommits <= 1) return 0
  return props.currentIndex / (props.totalCommits - 1)
})

const currentCommit = computed(() => {
  return props.commits[props.currentIndex]
})

function onSliderInput(e: Event) {
  const val = parseFloat((e.target as HTMLInputElement).value)
  const index = Math.round(val * (props.totalCommits - 1))
  emit('seek', index)
}
</script>

<template>
  <div class="timeline-control">
    <div class="control-row">
      <button class="ctrl-btn" @click="emit('prev')" title="上一步">⏮</button>
      <button class="ctrl-btn play-btn" @click="emit('toggle-play')" title="播放/暂停">
        {{ isPlaying ? '⏸' : '▶️' }}
      </button>
      <button class="ctrl-btn" @click="emit('next')" title="下一步">⏭</button>

      <div class="slider-container">
        <input
          type="range"
          :min="0"
          :max="1"
          :step="1 / (totalCommits - 1 || 1)"
          :value="progress"
          @input="onSliderInput"
          class="timeline-slider"
        />
      </div>

      <div class="commit-info">
        <span v-if="currentCommit" class="commit-hash">
          {{ currentCommit.hash.substring(0, 7) }}
        </span>
        <span class="commit-count">{{ currentIndex + 1 }} / {{ totalCommits }}</span>
      </div>

      <div class="speed-control">
        <span class="speed-label">速度</span>
        <select :value="speed" @change="emit('speed-change', parseFloat(($event.target as HTMLSelectElement).value))" class="speed-select">
          <option :value="0.25">0.25×</option>
          <option :value="0.5">0.5×</option>
          <option :value="1">1×</option>
          <option :value="2">2×</option>
          <option :value="4">4×</option>
        </select>
      </div>
    </div>

    <div v-if="currentCommit" class="commit-message-bar">
      <span class="msg-author">{{ currentCommit.author }}</span>
      <span class="msg-text">{{ currentCommit.message.split('\n')[0] }}</span>
      <span class="msg-date">{{ new Date(currentCommit.date).toLocaleDateString() }}</span>
    </div>
  </div>
</template>

<style scoped>
.timeline-control {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 10;
  background: var(--theme-control-bg);
  backdrop-filter: blur(10px);
  padding: 12px 20px;
  border-top: 1px solid rgba(255,255,255,0.1);
}

.control-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ctrl-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  color: var(--theme-text-primary);
  font-size: 18px;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.ctrl-btn:hover {
  background: rgba(255,255,255,0.1);
}

.play-btn {
  width: 44px;
  height: 44px;
  font-size: 22px;
  background: var(--theme-accent);
  color: #fff;
}

.play-btn:hover {
  opacity: 0.9;
}

.slider-container {
  flex: 1;
  padding: 0 8px;
}

.timeline-slider {
  width: 100%;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--theme-text-secondary);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.timeline-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--theme-accent);
  cursor: pointer;
}

.commit-info {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 13px;
  min-width: 120px;
}

.commit-hash {
  font-family: monospace;
  color: var(--theme-accent);
}

.commit-count {
  color: var(--theme-text-secondary);
}

.speed-control {
  display: flex;
  align-items: center;
  gap: 6px;
}

.speed-label {
  font-size: 12px;
  color: var(--theme-text-secondary);
}

.speed-select {
  padding: 4px 8px;
  border: 1px solid var(--theme-text-secondary);
  background: var(--theme-bg);
  color: var(--theme-text-primary);
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

.speed-select:hover {
  border-color: var(--theme-accent);
}

.speed-select:focus {
  outline: none;
  border-color: var(--theme-accent);
}

.speed-select option {
  background: var(--theme-bg);
  color: var(--theme-text-primary);
}

.commit-message-bar {
  margin-top: 8px;
  font-size: 13px;
  display: flex;
  gap: 12px;
  align-items: center;
}

.msg-author {
  color: var(--theme-accent);
  font-weight: 600;
}

.msg-text {
  color: var(--theme-text-primary);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.msg-date {
  color: var(--theme-text-secondary);
  font-size: 12px;
}
</style>