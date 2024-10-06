const themes = ['dark', 'light', 'rainbow', 'forest'] as const

export type Theme = (typeof themes)[number]
export default themes
