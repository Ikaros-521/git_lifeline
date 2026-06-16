export const themes = [
  { name: 'theme-cyber-forest', label: '赛博森林' },
  { name: 'theme-dawn-garden', label: '晨曦花园' },
  { name: 'theme-starry-night', label: '星夜' },
] as const

export type ThemeName = (typeof themes)[number]['name']
export type ThemeLabel = (typeof themes)[number]['label']