<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { ParticleSystem } from '../engine/ParticleSystem'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const system = ref<ParticleSystem | null>(null)

function getCanvasElement(): HTMLCanvasElement | null {
  return canvasRef.value
}

/** Fire a particle burst at a canvas-local coordinate. */
function burst(x: number, y: number, color: string, n?: number) {
  system.value?.spawnBurst(x, y, color, n)
}

function resize() {
  system.value?.resize()
}

let resizeObs: ResizeObserver | null = null

onMounted(() => {
  if (!canvasRef.value) return
  system.value = new ParticleSystem(canvasRef.value)
  system.value.start()

  resizeObs = new ResizeObserver(resize)
  if (containerRef.value) resizeObs.observe(containerRef.value)
})

onUnmounted(() => {
  system.value?.stop()
  resizeObs?.disconnect()
})

defineExpose({ getCanvasElement, burst, system })
</script>

<template>
  <div ref="containerRef" class="particle-canvas">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<style scoped>
.particle-canvas {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.particle-canvas canvas {
  width: 100%;
  height: 100%;
  display: block;
}
</style>