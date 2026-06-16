<script setup lang="ts">
import { ref, provide } from 'vue'
import GitLifeline from './components/GitLifeline.vue'
import DataSourcePanel from './components/DataSourcePanel.vue'
import type { ThemeName } from './assets/themes'

const currentTheme = ref<ThemeName>('theme-cyber-forest')
const showDataSource = ref(true)

function onDataLoaded() {
  showDataSource.value = false
}

function onNewProject() {
  showDataSource.value = true
}

function setTheme(theme: ThemeName) {
  currentTheme.value = theme
}

provide('currentTheme', currentTheme)
provide('setTheme', setTheme)
provide('onNewProject', onNewProject)
</script>

<template>
  <div :class="['app-root', currentTheme]">
    <DataSourcePanel
      v-if="showDataSource"
      @data-loaded="onDataLoaded"
    />
    <GitLifeline
      v-else
      @new-project="onNewProject"
    />
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

#app {
  width: 100%;
  height: 100%;
}

.app-root {
  width: 100%;
  height: 100%;
  background: var(--theme-bg);
  color: var(--theme-text-primary);
  transition: background 0.5s ease, color 0.5s ease;
}
</style>