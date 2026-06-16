import { ref, onUnmounted } from 'vue'

export function useAnimationEngine(totalSteps: number) {
  const isPlaying = ref(false)
  const speed = ref(1)
  const currentIndex = ref(0)
  const interProgress = ref(0)
  const totalCommits = ref(totalSteps)

  let animationId: number | null = null
  let lastTime = 0

  // Easing duration for interpolated transitions
  const EASE_DURATION = 500

  function tick(timestamp: number) {
    if (!lastTime) lastTime = timestamp
    const delta = (timestamp - lastTime) / 1000

    interProgress.value += (delta * speed.value) / (EASE_DURATION / 1000)

    if (interProgress.value >= 1) {
      interProgress.value = 0
      if (currentIndex.value < totalCommits.value - 1) {
        currentIndex.value++
      } else {
        stop()
        return
      }
    }

    lastTime = timestamp
    animationId = requestAnimationFrame(tick)
  }

  function play() {
    if (isPlaying.value) return
    if (currentIndex.value >= totalCommits.value - 1) {
      currentIndex.value = 0
      interProgress.value = 0
    }
    isPlaying.value = true
    lastTime = 0
    animationId = requestAnimationFrame(tick)
  }

  function pause() {
    isPlaying.value = false
    if (animationId !== null) {
      cancelAnimationFrame(animationId)
      animationId = null
    }
  }

  function stop() {
    pause()
    currentIndex.value = 0
    interProgress.value = 0
  }

  function togglePlay() {
    if (isPlaying.value) pause()
    else play()
  }

  function seek(index: number) {
    currentIndex.value = Math.max(0, Math.min(index, totalCommits.value - 1))
    interProgress.value = 0
  }

  function setSpeed(rate: number) {
    speed.value = Math.max(0.1, Math.min(10, rate))
  }

  function next() {
    if (currentIndex.value < totalCommits.value - 1) {
      currentIndex.value++
      interProgress.value = 0
    }
  }

  function prev() {
    if (currentIndex.value > 0) {
      currentIndex.value--
      interProgress.value = 0
    }
  }

  function setTotal(n: number) {
    totalCommits.value = n
  }

  onUnmounted(() => {
    if (animationId !== null) cancelAnimationFrame(animationId)
  })

  return {
    isPlaying,
    speed,
    currentIndex,
    interProgress,
    totalCommits,
    play,
    pause,
    stop,
    togglePlay,
    seek,
    setSpeed,
    next,
    prev,
    setTotal
  }
}