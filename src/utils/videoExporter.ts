import type { CompositeSources } from './frameCompositor'
import { renderCompositeFrame } from './frameCompositor'

export type ExportProgress = (pct: number) => void
export type ExportStepFrame = () => void | Promise<void>

export interface ExportDriver {
  stepFrame: ExportStepFrame
  cleanup: () => void
}

export const EXPORT_FPS = 30

type CanvasCaptureTrack = MediaStreamTrack & { requestFrame?: () => void }

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Quick export via MediaRecorder API (WebM).
 * Uses fixed-FPS stepping + manual requestFrame() for smooth, stutter-free output.
 */
export async function quickExport(
  targetCanvas: HTMLCanvasElement,
  sources: CompositeSources,
  durationSec: number,
  stepFrame: ExportStepFrame,
  onProgress?: ExportProgress
): Promise<Blob> {
  const frameCount = Math.round(durationSec * EXPORT_FPS)
  const frameInterval = 1000 / EXPORT_FPS

  const stream = targetCanvas.captureStream(0)
  const track = stream.getVideoTracks()[0] as CanvasCaptureTrack
  const chunks: BlobPart[] = []

  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm'
  })

  return new Promise((resolve, reject) => {
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }

    mediaRecorder.onstop = () => {
      resolve(new Blob(chunks, { type: 'video/webm' }))
    }

    mediaRecorder.onerror = () => reject(new Error('MediaRecorder error'))

    mediaRecorder.start(100)

    ;(async () => {
      try {
        for (let i = 0; i < frameCount; i++) {
          const t0 = performance.now()

          await stepFrame()
          await renderCompositeFrame(targetCanvas, sources)
          track.requestFrame?.()

          onProgress?.((i + 1) / frameCount)

          const elapsed = performance.now() - t0
          if (elapsed < frameInterval) {
            await sleep(frameInterval - elapsed)
          }
        }
        mediaRecorder.stop()
      } catch (e) {
        mediaRecorder.stop()
        reject(e instanceof Error ? e : new Error(String(e)))
      }
    })()
  })
}

/**
 * High quality export — captures individual composite PNG frames at fixed FPS.
 */
export async function highQualityFrames(
  targetCanvas: HTMLCanvasElement,
  sources: CompositeSources,
  durationSec: number,
  stepFrame: ExportStepFrame,
  onProgress?: ExportProgress
): Promise<string[]> {
  const frameCount = Math.round(durationSec * EXPORT_FPS)
  const frameInterval = 1000 / EXPORT_FPS
  const frames: string[] = []

  for (let i = 0; i < frameCount; i++) {
    const t0 = performance.now()

    await stepFrame()
    await renderCompositeFrame(targetCanvas, sources)
    frames.push(targetCanvas.toDataURL('image/png'))
    onProgress?.((i + 1) / frameCount)

    const elapsed = performance.now() - t0
    if (i < frameCount - 1 && elapsed < frameInterval) {
      await sleep(frameInterval - elapsed)
    }
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
