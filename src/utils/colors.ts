/** Read theme variable from the active theme host first, fallback to root. */
export function getCSSVar(name: string): string {
  const themeHost = document.querySelector('.app-root') as HTMLElement | null
  const hostValue = themeHost ? getComputedStyle(themeHost).getPropertyValue(name).trim() : ''
  if (hostValue) return hostValue
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

/** Parse CSS color to RGB array for canvas usage */
export function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return [255, 255, 255]
  return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
}

/** Format RGB to canvas-friendly rgba string */
export function rgba(r: number, g: number, b: number, a: number = 1): string {
  return `rgba(${r},${g},${b},${a})`
}

/** Get all theme CSS variable values as an object */
export function getThemeVars() {
  return {
    treeBranch: getCSSVar('--theme-tree-branch') || '#94a3b8',
    treeLeaf: getCSSVar('--theme-tree-leaf') || '#cbd5e1',
    treeAdded: getCSSVar('--theme-tree-added') || '#4ade80',
    treeDeleted: getCSSVar('--theme-tree-deleted') || '#f87171',
    treeModified: getCSSVar('--theme-tree-modified') || '#fbbf24',
    treeNodeStroke: getCSSVar('--theme-tree-node-stroke') || '#f8fafc',
    treeLabelColor: getCSSVar('--theme-tree-label-color') || '#e2e8f0',
    treeLabelOutline: getCSSVar('--theme-tree-label-outline') || 'rgba(15, 23, 42, 0.95)',
    treeLabelAdded: getCSSVar('--theme-tree-label-added') || '#86efac',
    treeLabelDeleted: getCSSVar('--theme-tree-label-deleted') || '#fca5a5',
    treeLabelModified: getCSSVar('--theme-tree-label-modified') || '#fde68a',
    particleColor: getCSSVar('--theme-particle-color') || '#94a3b8',
    particleCount: parseInt(getCSSVar('--theme-particle-count')) || 80,
  }
}