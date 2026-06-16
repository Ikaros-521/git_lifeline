export type ExportProgress = (pct: number) => void

/**
 * Quick export via MediaRecorder API (WebM).
 */
export function quickExport(
  canvas: HTMLCanvasElement,
  durationMs: number,
  onProgress?: ExportProgress
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const stream = canvas.captureStream(30)
    const chunks: BlobPart[] = []

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm'
    })

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' })
      resolve(blob)
    }

    mediaRecorder.onerror = () => reject(new Error('MediaRecorder error'))

    mediaRecorder.start(100) // collect data every 100ms

    // Emulate progress
    const startTime = Date.now()
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime
      onProgress?.(Math.min(0.95, elapsed / durationMs))
    }, 200)

    // Stop after duration
    setTimeout(() => {
      mediaRecorder.stop()
      clearInterval(progressInterval)
      onProgress?.(1)
    }, durationMs)
  })
}

/**
 * High quality export — captures individual frames for CCapture/PNG.
 * Returns array of data URLs per frame.
 */
export function highQualityFrames(
  canvas: HTMLCanvasElement,
  frameCount: number,
  onProgress?: ExportProgress
): string[] {
  const frames: string[] = []
  for (let i = 0; i < frameCount; i++) {
    frames.push(canvas.toDataURL('image/png'))
    onProgress?.((i + 1) / frameCount)
  }
  return frames
}

/**
 * Download a blob as a file.
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}