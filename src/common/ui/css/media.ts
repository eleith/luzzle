import { breakpoints } from './breakpoints'

export const mediaMotionSafe = '(prefers-reduced-motion: no-preference)'
export const mediaBreakpointPhone = `screen and (min-width: ${breakpoints.phone}px)`
export const mediaBreakpointTablet = `screen and (min-width: ${breakpoints.tablet}px)`
export const mediaBreakpointLaptop = `screen and (min-width: ${breakpoints.laptop}px)`
export const mediaBreakpointDesktop = `screen and (min-width: ${breakpoints.desktop}px)`
