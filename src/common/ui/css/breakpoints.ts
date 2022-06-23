export const breakpoints = {
  phone: 640,
  tablet: 768,
  laptop: 1024,
  desktop: 1280,
} as const

export type Breakpoint = keyof typeof breakpoints
export const breakpointNames = Object.keys(breakpoints) as Breakpoint[]
