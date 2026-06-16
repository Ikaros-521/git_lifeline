<script setup lang="ts">
import type { Commit, CommitSnapshot } from '../data/types'

defineProps<{
  commit?: Commit
  snapshot?: CommitSnapshot
}>()

const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <div class="detail-overlay" @click.self="emit('close')">
    <div class="detail-panel" v-if="commit">
      <button class="close-btn" @click="emit('close')">✕</button>
      <h2 class="detail-title">提交详情</h2>

      <div class="detail-section">
        <div class="detail-row">
          <span class="label">Hash</span>
          <code class="value hash">{{ commit.hash.substring(0, 12) }}</code>
        </div>
        <div class="detail-row">
          <span class="label">作者</span>
          <span class="value">{{ commit.author }} &lt;{{ commit.email }}&gt;</span>
        </div>
        <div class="detail-row">
          <span class="label">日期</span>
          <span class="value">{{ new Date(commit.date).toLocaleString() }}</span>
        </div>
        <div class="detail-row">
          <span class="label">分支</span>
          <span class="value">
            <span v-if="commit.branches.length">{{ commit.branches.join(', ') }}</span>
            <span v-else class="dim">-</span>
          </span>
        </div>
      </div>

      <div class="detail-section">
        <h3>提交信息</h3>
        <pre class="message">{{ commit.message }}</pre>
      </div>

      <div class="detail-section">
        <h3>文件变更 ({{ commit.files.length }})</h3>
        <div class="file-list">
          <div
            v-for="file in commit.files"
            :key="file.path"
            :class="['file-item', `status-${file.status}`]"
          >
            <span class="file-status">
              {{ file.status === 'added' ? 'A' : file.status === 'deleted' ? 'D' : 'M' }}
            </span>
            <span class="file-path">{{ file.path }}</span>
            <span v-if="file.additions > 0" class="additions">+{{ file.additions }}</span>
            <span v-if="file.deletions > 0" class="deletions">-{{ file.deletions }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.detail-overlay {
  position: absolute;
  inset: 0;
  z-index: 30;
  background: rgba(0,0,0,0.4);
  display: flex;
  justify-content: flex-end;
}

.detail-panel {
  width: 380px;
  height: 100%;
  background: var(--theme-control-bg);
  backdrop-filter: blur(10px);
  padding: 24px;
  overflow-y: auto;
  position: relative;
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--theme-text-primary);
  font-size: 18px;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: rgba(255,255,255,0.1);
}

.detail-title {
  font-size: 18px;
  margin-bottom: 20px;
}

.detail-section {
  margin-bottom: 20px;
}

.detail-section h3 {
  font-size: 14px;
  color: var(--theme-text-secondary);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 13px;
}

.label {
  color: var(--theme-text-secondary);
  min-width: 50px;
}

.value {
  color: var(--theme-text-primary);
}

.value.hash {
  font-family: monospace;
  font-size: 12px;
  color: var(--theme-accent);
}

.dim { color: var(--theme-text-secondary); }

.message {
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  color: var(--theme-text-primary);
  font-family: inherit;
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 300px;
  overflow-y: auto;
}

.file-item {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  font-family: monospace;
}

.file-item.status-added { background: rgba(74,222,128,0.1); }
.file-item.status-deleted { background: rgba(248,113,113,0.1); }
.file-item.status-modified { background: rgba(251,191,36,0.1); }

.file-status {
  font-weight: bold;
  width: 20px;
  text-align: center;
}

.status-added .file-status { color: var(--theme-tree-added); }
.status-deleted .file-status { color: var(--theme-tree-deleted); }
.status-modified .file-status { color: var(--theme-tree-modified); }

.file-path { flex: 1; color: var(--theme-text-primary); }

.additions { color: var(--theme-tree-added); }
.deletions { color: var(--theme-tree-deleted); }
</style>