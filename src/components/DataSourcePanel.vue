<script setup lang="ts">
import { ref } from 'vue'
import { useCommitStore } from '../composables/useCommitStore'
import { getGitLogHint } from '../data/adapters/GitLogParser'

const emit = defineEmits<{ 'data-loaded': [] }>()

const store = useCommitStore()

const activeTab = ref<'sample' | 'paste' | 'github'>('sample')
const pasteText = ref('')
const githubUrl = ref('')
const loadingMsg = ref('')

async function loadSample() {
  store.loadSample()
  emit('data-loaded')
}

function loadPaste() {
  if (!pasteText.value.trim()) return
  store.loadFromPaste(pasteText.value)
  if (!store.error.value) emit('data-loaded')
}

async function loadGitHub() {
  if (!githubUrl.value.trim()) return
  loadingMsg.value = '正在从 GitHub 获取提交数据...'
  await store.loadFromGitHub(githubUrl.value)
  loadingMsg.value = ''
  if (!store.error.value) emit('data-loaded')
}
</script>

<template>
  <div class="data-source-panel">
    <div class="panel-card">
      <h1 class="title">🌳 Git 生命线</h1>
      <p class="subtitle">将你的 Git 提交历史，变成一棵生长的生命树</p>

      <div class="tabs">
        <button
          :class="['tab', { active: activeTab === 'sample' }]"
          @click="activeTab = 'sample'"
        >🎮 快速体验</button>
        <button
          :class="['tab', { active: activeTab === 'paste' }]"
          @click="activeTab = 'paste'"
        >📋 粘贴日志</button>
        <button
          :class="['tab', { active: activeTab === 'github' }]"
          @click="activeTab = 'github'"
        >🐙 GitHub 仓库</button>
      </div>

      <div class="tab-content">
        <div v-if="activeTab === 'sample'" class="tab-pane">
          <p>立即体验内置示例仓库。下面先看一眼动画预览和颜色含义，再一键开始。</p>
          <div class="sample-preview">
            <div class="preview-head">
              <span class="preview-title">生命线预览</span>
              <span class="preview-chip">Commit Timeline</span>
            </div>
            <svg viewBox="0 0 520 180" class="preview-svg" aria-hidden="true">
              <defs>
                <linearGradient id="previewGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="var(--theme-tree-branch)" />
                  <stop offset="100%" stop-color="var(--theme-tree-leaf)" />
                </linearGradient>
                <filter id="softBlur">
                  <feGaussianBlur stdDeviation="2.5" />
                </filter>
              </defs>
              <path d="M30,120 C120,50 220,145 300,80 C350,40 430,60 490,35" class="preview-link preview-link-glow" />
              <path d="M30,120 C120,50 220,145 300,80 C350,40 430,60 490,35" class="preview-link" />
              <circle cx="30" cy="120" r="8" class="preview-node node-base" />
              <circle cx="130" cy="78" r="7" class="preview-node node-add" />
              <circle cx="220" cy="126" r="7" class="preview-node node-mod" />
              <circle cx="310" cy="82" r="7" class="preview-node node-base" />
              <circle cx="405" cy="60" r="7" class="preview-node node-del" />
              <circle cx="490" cy="35" r="8" class="preview-node node-add pulse-node" />
              <text x="30" y="145" class="preview-label">init</text>
              <text x="130" y="62" class="preview-label">feat/auth</text>
              <text x="220" y="148" class="preview-label">refactor</text>
              <text x="310" y="66" class="preview-label">docs</text>
              <text x="405" y="44" class="preview-label">rollback</text>
              <text x="490" y="18" class="preview-label">release</text>
            </svg>
            <div class="preview-legend">
              <span class="legend-item"><i class="legend-dot dot-base"></i>普通节点（文件/目录）</span>
              <span class="legend-item"><i class="legend-dot dot-add"></i>新增（Added）</span>
              <span class="legend-item"><i class="legend-dot dot-mod"></i>修改（Modified）</span>
              <span class="legend-item"><i class="legend-dot dot-del"></i>删除（Deleted）</span>
            </div>
          </div>
          <button class="btn-primary" @click="loadSample">🎬 开始体验</button>
        </div>

        <div v-if="activeTab === 'paste'" class="tab-pane">
          <p>在终端运行以下命令，将输出粘贴到下方：</p>
          <code class="hint">{{ getGitLogHint() }}</code>
          <textarea
            v-model="pasteText"
            class="paste-input"
            placeholder="在此粘贴 git log 输出..."
            rows="10"
          ></textarea>
          <button class="btn-primary" :disabled="!pasteText.trim()" @click="loadPaste">
            📊 开始分析
          </button>
        </div>

        <div v-if="activeTab === 'github'" class="tab-pane">
          <p>输入公开 GitHub 仓库 URL：</p>
          <input
            v-model="githubUrl"
            type="text"
            class="url-input"
            placeholder="例如: https://github.com/vuejs/core"
          />
          <button class="btn-primary" :disabled="!githubUrl.trim() || !!loadingMsg" @click="loadGitHub">
            {{ loadingMsg || '⬇️ 获取数据' }}
          </button>
        </div>
      </div>

      <div v-if="store.error.value" class="error-msg">
        ⚠️ {{ store.error.value }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.data-source-panel {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--theme-bg);
  padding: 20px;
}

.panel-card {
  max-width: 560px;
  width: 100%;
  padding: 40px;
  border-radius: 16px;
  background: var(--theme-control-bg);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 35%, transparent);
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.title {
  font-size: 2rem;
  margin-bottom: 8px;
  text-align: center;
}

.subtitle {
  text-align: center;
  color: var(--theme-text-secondary);
  margin-bottom: 32px;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
}

.tab {
  flex: 1;
  padding: 10px 16px;
  border: 1px solid var(--theme-text-secondary);
  background: transparent;
  color: var(--theme-text-primary);
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.tab.active {
  background: var(--theme-accent);
  border-color: var(--theme-accent);
  color: #fff;
}

.tab-content {
  min-height: 200px;
}

.tab-pane {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sample-preview {
  padding: 14px;
  border-radius: 12px;
  background:
    radial-gradient(circle at 85% 20%, color-mix(in srgb, var(--theme-accent) 32%, transparent), transparent 48%),
    linear-gradient(140deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.01));
  border: 1px solid color-mix(in srgb, var(--theme-accent) 45%, transparent);
}

.preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.preview-title {
  font-size: 13px;
  color: var(--theme-text-primary);
  font-weight: 700;
  letter-spacing: 0.3px;
}

.preview-chip {
  font-size: 11px;
  color: var(--theme-text-primary);
  background: color-mix(in srgb, var(--theme-accent) 28%, transparent);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 65%, transparent);
  padding: 3px 8px;
  border-radius: 999px;
}

.preview-svg {
  width: 100%;
  height: 180px;
  display: block;
  border-radius: 10px;
  background:
    linear-gradient(0deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 28px 28px;
}

.preview-link {
  fill: none;
  stroke: url(#previewGlow);
  stroke-width: 3;
}

.preview-link-glow {
  stroke-width: 9;
  opacity: 0.26;
  filter: url(#softBlur);
}

.preview-node {
  stroke: var(--theme-tree-node-stroke, #f8fafc);
  stroke-width: 2;
}

.node-base { fill: var(--theme-tree-leaf); }
.node-add { fill: var(--theme-tree-added); }
.node-mod { fill: var(--theme-tree-modified); }
.node-del { fill: var(--theme-tree-deleted); }

.preview-label {
  fill: var(--theme-tree-label-color, var(--theme-text-primary));
  font-size: 11px;
  font-weight: 700;
  paint-order: stroke;
  stroke: var(--theme-tree-label-outline, rgba(0, 0, 0, 0.8));
  stroke-width: 3px;
  stroke-linejoin: round;
}

.pulse-node {
  animation: pulse 1.6s ease-in-out infinite;
}

.preview-legend {
  margin-top: 10px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--theme-text-primary);
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  border: 1px solid var(--theme-tree-node-stroke, #fff);
  flex-shrink: 0;
}

.dot-base { background: var(--theme-tree-leaf); }
.dot-add { background: var(--theme-tree-added); }
.dot-mod { background: var(--theme-tree-modified); }
.dot-del { background: var(--theme-tree-deleted); }

@keyframes pulse {
  0% { transform: scale(1); opacity: 0.95; }
  50% { transform: scale(1.17); opacity: 1; }
  100% { transform: scale(1); opacity: 0.95; }
}

.hint {
  font-size: 12px;
  padding: 12px;
  background: rgba(0,0,0,0.2);
  border-radius: 8px;
  word-break: break-all;
  font-family: monospace;
}

.paste-input, .url-input {
  padding: 12px;
  border: 1px solid var(--theme-text-secondary);
  background: rgba(0,0,0,0.15);
  color: var(--theme-text-primary);
  border-radius: 8px;
  font-family: monospace;
  resize: vertical;
}

.url-input {
  font-family: inherit;
}

.btn-primary {
  padding: 12px 24px;
  background: var(--theme-accent);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-msg {
  margin-top: 16px;
  padding: 12px;
  background: rgba(248,113,113,0.15);
  border: 1px solid var(--theme-tree-deleted);
  border-radius: 8px;
  color: var(--theme-tree-deleted);
}
</style>