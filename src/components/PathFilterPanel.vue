<script setup lang="ts">
import { ref, watch } from 'vue'
import type { PathFilter, PathFilterMode } from '../data/types'
import { parsePathPatterns } from '../utils/pathFilter'

const props = defineProps<{
  filter: PathFilter
  rawTotal: number
  filteredTotal: number
}>()

const emit = defineEmits<{
  apply: [filter: PathFilter]
  close: []
}>()

const mode = ref<PathFilterMode>(props.filter.mode)
const patternsText = ref(props.filter.patternsText)

const MODES: { id: PathFilterMode; label: string; hint: string }[] = [
  { id: 'none', label: '关闭', hint: '显示全部文件与提交' },
  { id: 'whitelist', label: '白名单', hint: '仅显示匹配路径的文件与相关提交' },
  { id: 'blacklist', label: '黑名单', hint: '隐藏匹配路径的文件，跳过仅含这些文件的提交' }
]

const EXAMPLES = [
  'src/',
  'src/components/',
  '*.vue',
  '**/*.ts',
  'package.json',
  '# 以 # 开头的行为注释'
]

watch(
  () => props.filter,
  (f) => {
    mode.value = f.mode
    patternsText.value = f.patternsText
  },
  { deep: true }
)

function apply() {
  emit('apply', { mode: mode.value, patternsText: patternsText.value })
}

function reset() {
  mode.value = 'none'
  patternsText.value = ''
  emit('apply', { mode: 'none', patternsText: '' })
}

const patternCount = () => parsePathPatterns(patternsText.value).length
</script>

<template>
  <div class="filter-overlay" @click.self="emit('close')">
    <div class="filter-panel">
      <button class="close-btn" type="button" @click="emit('close')">✕</button>
      <h2 class="panel-title">路径筛选</h2>
      <p class="panel-desc">按文件路径过滤生命线动画，只观看你关心的目录或文件。</p>

      <div class="section">
        <span class="section-label">筛选模式</span>
        <div class="mode-tabs">
          <button
            v-for="m in MODES"
            :key="m.id"
            type="button"
            :class="['mode-btn', { active: mode === m.id }]"
            :title="m.hint"
            @click="mode = m.id"
          >{{ m.label }}</button>
        </div>
        <p class="mode-hint">{{ MODES.find(m => m.id === mode)?.hint }}</p>
      </div>

      <div v-if="mode !== 'none'" class="section">
        <div class="section-head">
          <span class="section-label">路径规则</span>
          <span class="pattern-count">已输入 {{ patternCount() }} 条</span>
        </div>
        <textarea
          v-model="patternsText"
          class="patterns-input"
          rows="8"
          placeholder="每行一条规则，例如：&#10;src/&#10;src/components/&#10;*.vue&#10;**/*.ts"
        />
        <div class="examples">
          <span class="examples-label">示例：</span>
          <code v-for="(ex, i) in EXAMPLES" :key="i" class="example-chip">{{ ex }}</code>
        </div>
        <p class="pattern-help">
          支持目录前缀（<code>src/</code>）、通配符（<code>*</code> 单段、<code>**</code> 跨目录、<code>?</code> 单字符）。
        </p>
      </div>

      <div v-if="rawTotal > 0" class="stats">
        <span>原始提交 {{ rawTotal }} 个</span>
        <span v-if="mode !== 'none' && patternCount() > 0" class="stats-sep">→</span>
        <span v-if="mode !== 'none' && patternCount() > 0">当前展示 {{ filteredTotal }} 个</span>
      </div>

      <div class="actions">
        <button type="button" class="btn-secondary" @click="reset">清除筛选</button>
        <button type="button" class="btn-primary" @click="apply">应用筛选</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.filter-overlay {
  position: absolute;
  inset: 0;
  z-index: 30;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: flex-start;
}

.filter-panel {
  width: min(420px, 100%);
  height: 100%;
  background: var(--theme-control-bg);
  backdrop-filter: blur(10px);
  padding: 24px;
  overflow-y: auto;
  position: relative;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
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
  background: rgba(255, 255, 255, 0.1);
}

.panel-title {
  font-size: 18px;
  margin-bottom: 8px;
}

.panel-desc {
  font-size: 13px;
  color: var(--theme-text-secondary);
  line-height: 1.5;
  margin-bottom: 20px;
}

.section {
  margin-bottom: 20px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.section-label {
  font-size: 13px;
  font-weight: 600;
}

.pattern-count {
  font-size: 12px;
  color: var(--theme-text-secondary);
}

.mode-tabs {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.mode-btn {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--theme-text-secondary);
  background: transparent;
  color: var(--theme-text-primary);
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.mode-btn.active {
  background: var(--theme-accent);
  border-color: var(--theme-accent);
  color: #fff;
}

.mode-hint {
  margin-top: 8px;
  font-size: 12px;
  color: var(--theme-text-secondary);
}

.patterns-input {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--theme-text-secondary);
  background: rgba(0, 0, 0, 0.15);
  color: var(--theme-text-primary);
  border-radius: 8px;
  font-family: ui-monospace, 'Cascadia Code', Consolas, monospace;
  font-size: 12px;
  line-height: 1.5;
  resize: vertical;
  min-height: 140px;
}

.examples {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
  align-items: center;
}

.examples-label {
  font-size: 12px;
  color: var(--theme-text-secondary);
}

.example-chip {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.2);
  color: var(--theme-text-primary);
  font-family: monospace;
}

.pattern-help {
  margin-top: 8px;
  font-size: 12px;
  color: var(--theme-text-secondary);
  line-height: 1.5;
}

.pattern-help code {
  font-family: monospace;
  font-size: 11px;
  padding: 1px 4px;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.2);
}

.stats {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 13px;
  color: var(--theme-text-secondary);
  margin-bottom: 20px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.15);
}

.stats-sep {
  color: var(--theme-accent);
}

.actions {
  display: flex;
  gap: 10px;
}

.btn-primary,
.btn-secondary {
  flex: 1;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn-primary {
  background: var(--theme-accent);
  color: #fff;
  border: none;
}

.btn-secondary {
  background: transparent;
  color: var(--theme-text-primary);
  border: 1px solid var(--theme-text-secondary);
}

.btn-secondary:hover {
  border-color: var(--theme-accent);
  color: var(--theme-accent);
}
</style>
