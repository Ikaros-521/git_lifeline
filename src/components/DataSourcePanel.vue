<script setup lang="ts">
import { ref } from 'vue'
import { useCommitStore } from '../composables/useCommitStore'
import { getGitLogHint, GIT_LOG_SINCE_PRESETS, type GitLogShell } from '../data/adapters/GitLogParser'

const emit = defineEmits<{ 'data-loaded': [] }>()

const store = useCommitStore()

type DatePreset = 'week' | 'month' | 'quarter' | 'halfYear' | 'year' | 'custom'

const DATE_PRESETS: { id: DatePreset; label: string; days?: number }[] = [
  { id: 'week', label: '近一周', days: 7 },
  { id: 'month', label: '近一月', days: 30 },
  { id: 'quarter', label: '近三月', days: 90 },
  { id: 'halfYear', label: '近半年', days: 180 },
  { id: 'year', label: '近一年', days: 365 },
  { id: 'custom', label: '自定义' }
]

const GIT_LOG_SHELLS: { id: GitLogShell; label: string }[] = [
  { id: 'powershell', label: 'PowerShell' },
  { id: 'bash', label: 'Bash / Git Bash' }
]

const activeTab = ref<'sample' | 'paste' | 'github'>('sample')
const pasteText = ref('')
const githubUrl = ref('')
const loadingMsg = ref('')
const datePreset = ref<DatePreset>('month')
const customSince = ref('')
const customUntil = ref('')
const gitLogShell = ref<GitLogShell>(
  typeof navigator !== 'undefined' && /Win/i.test(navigator.userAgent) ? 'powershell' : 'bash'
)

function daysAgo(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(0, 0, 0, 0)
  return d
}

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function getGitHubDateRange(): { since: Date; until: Date } {
  const until = new Date()
  until.setHours(23, 59, 59, 999)

  if (datePreset.value === 'custom') {
    const since = customSince.value
      ? new Date(`${customSince.value}T00:00:00`)
      : daysAgo(30)
    const customEnd = customUntil.value
      ? new Date(`${customUntil.value}T23:59:59`)
      : until
    return { since, until: customEnd }
  }

  const preset = DATE_PRESETS.find(p => p.id === datePreset.value)
  return { since: daysAgo(preset?.days ?? 30), until }
}

function selectPreset(id: DatePreset) {
  if (id === 'custom') {
    const prevPreset = DATE_PRESETS.find(p => p.id === datePreset.value)
    if (prevPreset?.days) {
      const until = new Date()
      customSince.value = toDateInputValue(daysAgo(prevPreset.days))
      customUntil.value = toDateInputValue(until)
    } else if (!customSince.value || !customUntil.value) {
      const until = new Date()
      customSince.value = toDateInputValue(daysAgo(30))
      customUntil.value = toDateInputValue(until)
    }
  }
  datePreset.value = id
}

function formatRangeLabel(): string {
  const { since, until } = getGitHubDateRange()
  return `${since.toLocaleDateString('zh-CN')} — ${until.toLocaleDateString('zh-CN')}`
}

function getPasteGitLogCommand(): string {
  const shell = gitLogShell.value
  if (datePreset.value === 'custom') {
    const opts: { since?: string; until?: string } = {}
    if (customSince.value) opts.since = customSince.value
    if (customUntil.value) opts.until = customUntil.value
    return getGitLogHint(opts, shell)
  }
  const since = GIT_LOG_SINCE_PRESETS[datePreset.value]
  return getGitLogHint(since ? { since } : undefined, shell)
}

async function loadSample() {
  store.loadSample()
  emit('data-loaded')
}

function loadPaste() {
  if (!pasteText.value.trim()) return
  store.loadFromPaste(pasteText.value)
  if (!store.error.value) emit('data-loaded')
}

function loadFromLogFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    const bytes = new Uint8Array(reader.result as ArrayBuffer)
    let text = ''
    if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
      text = new TextDecoder('utf-16le').decode(bytes)
    } else {
      text = new TextDecoder('utf-8').decode(bytes)
    }
    pasteText.value = text.replace(/^\uFEFF/, '')
    input.value = ''
  }
  reader.readAsArrayBuffer(file)
}

async function loadGitHub() {
  if (!githubUrl.value.trim()) return
  const range = getGitHubDateRange()
  loadingMsg.value = `正在获取 ${formatRangeLabel()} 的提交...`
  await store.loadFromGitHub(githubUrl.value, range)
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
          <p>在仓库目录运行以下命令，将日志导出到 <code class="inline-code">git-lifeline.log</code>，再打开文件复制内容到下方：</p>
          <div class="date-range-section">
            <div class="date-range-head">
              <span class="date-range-label">提交日期范围</span>
              <span class="date-range-hint">缩小范围可加快导出、减少文件体积</span>
            </div>
            <div class="date-presets">
              <button
                v-for="preset in DATE_PRESETS"
                :key="preset.id"
                type="button"
                :class="['preset-btn', { active: datePreset === preset.id }]"
                @click="selectPreset(preset.id)"
              >{{ preset.label }}</button>
            </div>
            <div v-if="datePreset === 'custom'" class="custom-dates">
              <label class="date-field">
                <span>起始</span>
                <input v-model="customSince" type="date" class="date-input" />
              </label>
              <label class="date-field">
                <span>截止</span>
                <input v-model="customUntil" type="date" class="date-input" />
              </label>
            </div>
            <p class="range-summary">当前范围：{{ formatRangeLabel() }}</p>
          </div>
          <div class="shell-section">
            <span class="date-range-label">终端类型</span>
            <div class="date-presets">
              <button
                v-for="shell in GIT_LOG_SHELLS"
                :key="shell.id"
                type="button"
                :class="['preset-btn', { active: gitLogShell === shell.id }]"
                @click="gitLogShell = shell.id"
              >{{ shell.label }}</button>
            </div>
          </div>
          <code class="hint">{{ getPasteGitLogCommand() }}</code>
          <p class="shell-hint">请整行复制含开头 <code class="inline-code">[Console]::OutputEncoding</code> 的完整命令；缺少前缀时 Out-File 或 <code class="inline-code">&gt;</code> 都会在中文 Windows 上乱码。也可直接点下方按钮导入文件。</p>
          <div class="paste-actions">
            <label class="btn-secondary file-btn">
              📂 从 git-lifeline.log 导入
              <input type="file" accept=".log,.txt" class="file-input" @change="loadFromLogFile" />
            </label>
          </div>
          <textarea
            v-model="pasteText"
            class="paste-input"
            placeholder="在此粘贴 git log 输出..."
            rows="6"
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
          <div class="date-range-section">
            <div class="date-range-head">
              <span class="date-range-label">提交日期范围</span>
              <span class="date-range-hint">缩小范围可减少请求量，降低限流风险</span>
            </div>
            <div class="date-presets">
              <button
                v-for="preset in DATE_PRESETS"
                :key="preset.id"
                type="button"
                :class="['preset-btn', { active: datePreset === preset.id }]"
                @click="selectPreset(preset.id)"
              >{{ preset.label }}</button>
            </div>
            <div v-if="datePreset === 'custom'" class="custom-dates">
              <label class="date-field">
                <span>起始</span>
                <input v-model="customSince" type="date" class="date-input" />
              </label>
              <label class="date-field">
                <span>截止</span>
                <input v-model="customUntil" type="date" class="date-input" />
              </label>
            </div>
            <p class="range-summary">当前范围：{{ formatRangeLabel() }}</p>
          </div>
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
  padding: 16px;
  overflow: hidden;
}

.panel-card {
  max-width: 560px;
  width: 100%;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  padding: 32px;
  border-radius: 16px;
  background: var(--theme-control-bg);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 35%, transparent);
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.title {
  font-size: 2rem;
  margin-bottom: 8px;
  text-align: center;
  flex-shrink: 0;
}

.subtitle {
  text-align: center;
  color: var(--theme-text-secondary);
  margin-bottom: 24px;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-shrink: 0;
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
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--theme-accent) 40%, transparent) transparent;
}

.tab-content::-webkit-scrollbar {
  width: 6px;
}

.tab-content::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--theme-accent) 40%, transparent);
  border-radius: 3px;
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

.inline-code {
  font-family: monospace;
  font-size: 0.92em;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.2);
}

.hint {
  font-size: 12px;
  padding: 12px;
  background: rgba(0,0,0,0.2);
  border-radius: 8px;
  word-break: break-all;
  font-family: monospace;
}

.shell-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.shell-hint {
  margin: -8px 0 0;
  font-size: 12px;
  color: var(--theme-text-secondary);
  line-height: 1.5;
}

.paste-actions {
  display: flex;
  gap: 8px;
}

.file-btn {
  position: relative;
  overflow: hidden;
  cursor: pointer;
}

.file-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 16px;
  border: 1px solid var(--theme-text-secondary);
  background: transparent;
  color: var(--theme-text-primary);
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-secondary:hover {
  border-color: var(--theme-accent);
  color: var(--theme-accent);
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

.paste-input {
  min-height: 96px;
  max-height: 200px;
}

.url-input {
  font-family: inherit;
}

.date-range-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.15);
  border: 1px solid color-mix(in srgb, var(--theme-text-secondary) 40%, transparent);
}

.date-range-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.date-range-label {
  font-size: 13px;
  font-weight: 600;
}

.date-range-hint {
  font-size: 12px;
  color: var(--theme-text-secondary);
}

.date-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.preset-btn {
  padding: 6px 12px;
  border: 1px solid var(--theme-text-secondary);
  background: transparent;
  color: var(--theme-text-primary);
  border-radius: 999px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.preset-btn.active {
  background: color-mix(in srgb, var(--theme-accent) 25%, transparent);
  border-color: var(--theme-accent);
  color: var(--theme-text-primary);
}

.custom-dates {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.date-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: var(--theme-text-secondary);
}

.date-input {
  padding: 8px 10px;
  border: 1px solid var(--theme-text-secondary);
  background: rgba(0, 0, 0, 0.15);
  color: var(--theme-text-primary);
  border-radius: 8px;
  font-family: inherit;
}

.range-summary {
  margin: 0;
  font-size: 12px;
  color: var(--theme-text-secondary);
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
  margin-top: 12px;
  padding: 12px;
  flex-shrink: 0;
  background: rgba(248,113,113,0.15);
  border: 1px solid var(--theme-tree-deleted);
  border-radius: 8px;
  color: var(--theme-tree-deleted);
}

@media (max-height: 700px) {
  .panel-card {
    padding: 20px 24px;
  }

  .title {
    font-size: 1.5rem;
  }

  .subtitle {
    margin-bottom: 16px;
    font-size: 14px;
  }

  .preview-svg {
    height: 140px;
  }
}
</style>