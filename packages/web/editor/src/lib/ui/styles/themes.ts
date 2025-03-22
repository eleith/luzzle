const themes = ['dark', 'light', 'forest'] as const

export type Theme = (typeof themes)[number]
export default themes
