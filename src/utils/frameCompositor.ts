import { getCSSVar } from './colors'

export interface CompositeSources {
  particleCanvas: HTMLCanvasElement
  svg: SVGSVGElement
  width: number
  height: number
}

const svgImage = new Image()

function rasterizeSvg(svg: SVGSVGElement): Promise<void> {
  const svgString = new XMLSerializer().serializeToString(svg)
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString)
  return new Promise((resolve, reject) => {
    svgImage.onload = () => resolve()
    svgImage.onerror = () => reject(new Error('Failed to rasterize SVG'))
    svgImage.src = url
  })
}

/** Composite particle canvas + SVG tree onto a single canvas for export. */
export async function renderCompositeFrame(
  target: HTMLCanvasElement,
  sources: CompositeSources
): Promise<void> {
  const ctx = target.getContext('2d')
  if (!ctx) return

  const { particleCanvas, svg, width, height } = sources

  if (target.width !== width || target.height !== height) {
    target.width = width
    target.height = height
  }

  const bg = getCSSVar('--theme-bg') || '#0f172a'
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(particleCanvas, 0, 0, width, height)

  await rasterizeSvg(svg)
  ctx.drawImage(svgImage, 0, 0, width, height)
}
