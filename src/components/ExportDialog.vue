<script setup lang="ts">
import { ref } from 'vue'
import { quickExport, highQualityFrames, downloadBlob, type ExportDriver } from '../utils/videoExporter'
import type { CompositeSources } from '../utils/frameCompositor'

const props = defineProps<{
  getSources: () => CompositeSources | null
  createExportDriver: () => ExportDriver
}>()

const emit = defineEmits<{ close: [] }>()

const mode = ref<'quick' | 'high'>('quick')
const exporting = ref(false)
const progress = ref(0)
const duration = ref(10)

async function doExport() {
  exporting.value = true
  progress.value = 0

  const sources = props.getSources()
  if (!sources) {
    alert('没有找到画布元素')
    exporting.value = false
    return
  }

  const compositeCanvas = document.createElement('canvas')
  const driver = props.createExportDriver()

  try {
    if (mode.value === 'quick') {
      const blob = await quickExport(
        compositeCanvas,
        sources,
        duration.value,
        driver.stepFrame,
        (pct) => { progress.value = pct }
      )
      downloadBlob(blob, `git-lifeline-${Date.now()}.webm`)
    } else {
      const frames = await highQualityFrames(
        compositeCanvas,
        sources,
        duration.value,
        driver.stepFrame,
        (pct) => { progress.value = pct }
      )

      if (frames.length > 0) {
        const blob = await (await fetch(frames[0])).blob()
        downloadBlob(blob, `git-lifeline-frame-0.png`)
      }
    }

    alert('导出完成！')
  } catch (e) {
    alert(`导出失败: ${e instanceof Error ? e.message : String(e)}`)
  } finally {
    driver.cleanup()
    exporting.value = false
    progress.value = 0
  }
}
</script>

<template>
  <div class="export-overlay" @click.self="emit('close')">
    <div class="export-dialog">
      <h2>导出视频</h2>

      <div class="export-options">
        <label class="option">
          <input type="radio" v-model="mode" value="quick" />
          <div class="option-content">
            <span class="option-title">快速录制 (WebM)</span>
            <span class="option-desc">浏览器直接录制，速度较快</span>
          </div>
        </label>
        <label class="option">
          <input type="radio" v-model="mode" value="high" />
          <div class="option-content">
            <span class="option-title">高质量 (PNG 序列)</span>
            <span class="option-desc">逐帧导出，质量更高</span>
          </div>
        </label>
      </div>

      <div class="duration-control">
        <label>导出时长（秒）</label>
        <input type="number" v-model.number="duration" :min="5" :max="120" />
      </div>

      <div v-if="exporting" class="progress-bar">
        <div class="progress-fill" :style="{ width: `${progress * 100}%` }"></div>
        <span>{{ Math.round(progress * 100) }}%</span>
      </div>

      <div class="dialog-actions">
        <button class="btn-cancel" @click="emit('close')">取消</button>
        <button class="btn-export" :disabled="exporting" @click="doExport">
          {{ exporting ? '导出中...' : '开始导出' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.export-overlay {
  position: absolute;
  inset: 0;
  z-index: 40;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.export-dialog {
  width: 420px;
  padding: 32px;
  background: var(--theme-control-bg);
  backdrop-filter: blur(10px);
  border-radius: 16px;
}

.export-dialog h2 {
  margin-bottom: 24px;
  font-size: 20px;
}

.export-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.option {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--theme-text-secondary);
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.2s;
}

.option:has(input:checked) {
  border-color: var(--theme-accent);
}

.option input { margin-top: 3px; }

.option-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.option-title { font-weight: 600; font-size: 14px; }
.option-desc { font-size: 12px; color: var(--theme-text-secondary); }

.duration-control {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.duration-control input {
  width: 80px;
  padding: 6px 10px;
  border: 1px solid var(--theme-text-secondary);
  background: rgba(0,0,0,0.15);
  color: var(--theme-text-primary);
  border-radius: 4px;
}

.progress-bar {
  position: relative;
  height: 6px;
  background: rgba(255,255,255,0.1);
  border-radius: 3px;
  margin-bottom: 20px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--theme-accent);
  border-radius: 3px;
  transition: width 0.3s;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn-cancel, .btn-export {
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}

.btn-cancel {
  background: transparent;
  color: var(--theme-text-primary);
  border: 1px solid var(--theme-text-secondary);
}

.btn-export {
  background: var(--theme-accent);
  color: #fff;
}

.btn-export:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
