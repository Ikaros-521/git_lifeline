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
          <p>立即体验内置的示例仓库提交历史动画。无需配置，点击即可开始。</p>
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