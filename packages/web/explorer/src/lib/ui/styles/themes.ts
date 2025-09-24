const themes = ['dark', 'light', 'system'] as const

export type Theme = (typeof themes)[number]
export default themes
