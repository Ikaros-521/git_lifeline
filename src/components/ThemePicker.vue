<script setup lang="ts">
import { inject } from 'vue'
import { themes } from '../assets/themes'
import type { ThemeName } from '../assets/themes'

const currentTheme = inject('currentTheme')
const setTheme = inject<(name: ThemeName) => void>('setTheme')
</script>

<template>
  <div class="theme-picker">
    <button
      v-for="theme in themes"
      :key="theme.name"
      :class="['theme-btn', { active: currentTheme === theme.name }]"
      @click="setTheme?.(theme.name)"
    >
      {{ theme.label }}
    </button>
  </div>
</template>

<style scoped>
.theme-picker {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 20;
  display: flex;
  gap: 6px;
}

.theme-btn {
  padding: 6px 14px;
  border: 1px solid var(--theme-text-secondary);
  background: var(--theme-control-bg);
  color: var(--theme-text-primary);
  border-radius: 20px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  backdrop-filter: blur(4px);
}

.theme-btn.active, .theme-btn:hover {
  border-color: var(--theme-accent);
  background: var(--theme-accent);
  color: #fff;
}
</style>