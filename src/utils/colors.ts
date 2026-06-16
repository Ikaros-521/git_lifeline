/** Get CSS variable value from the document */
export function getCSSVar(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()
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
    treeBranch: getCSSVar('--theme-tree-branch'),
    treeLeaf: getCSSVar('--theme-tree-leaf'),
    treeAdded: getCSSVar('--theme-tree-added'),
    treeDeleted: getCSSVar('--theme-tree-deleted'),
    treeModified: getCSSVar('--theme-tree-modified'),
    particleColor: getCSSVar('--theme-particle-color'),
    particleCount: parseInt(getCSSVar('--theme-particle-count')) || 80,
  }
}