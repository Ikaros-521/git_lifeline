<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { TreeRenderer } from '../engine/TreeRenderer'
import { getThemeVars } from '../utils/colors'

const svgRef = ref<SVGSVGElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const renderer = ref<TreeRenderer | null>(null)

function getSvgElement(): SVGSVGElement | null {
  return svgRef.value
}

function resize() {
  if (!containerRef.value || !svgRef.value || !renderer.value) return
  const { clientWidth, clientHeight } = containerRef.value
  svgRef.value.setAttribute('width', String(clientWidth))
  svgRef.value.setAttribute('height', String(clientHeight))
  renderer.value.resize(clientWidth, clientHeight)
}

let resizeObs: ResizeObserver | null = null

onMounted(() => {
  if (!containerRef.value || !svgRef.value) return
  const { clientWidth, clientHeight } = containerRef.value
  svgRef.value.setAttribute('width', String(clientWidth))
  svgRef.value.setAttribute('height', String(clientHeight))

  const vars = getThemeVars()
  renderer.value = new TreeRenderer({
    svgEl: svgRef.value,
    width: clientWidth,
    height: clientHeight,
    theme: {
      treeBranch: vars.treeBranch,
      treeLeaf: vars.treeLeaf,
      treeAdded: vars.treeAdded,
      treeDeleted: vars.treeDeleted,
      treeModified: vars.treeModified
    }
  })

  resizeObs = new ResizeObserver(resize)
  resizeObs.observe(containerRef.value)
})

onUnmounted(() => {
  resizeObs?.disconnect()
  renderer.value?.destroy()
})

defineExpose({ getSvgElement, renderer })
</script>

<template>
  <div ref="containerRef" class="tree-view">
    <svg ref="svgRef" class="tree-svg"></svg>
  </div>
</template>

<style scoped>
.tree-view {
  position: absolute;
  inset: 0;
  z-index: 1;
}

.tree-svg {
  display: block;
  width: 100%;
  height: 100%;
}
</style>