import { createGlobalTheme, globalStyle } from '@vanilla-extract/css'
import { calc } from '@vanilla-extract/css-utils'
import merge from 'deepmerge'
import { mediaBreakpointTablet, reset, theme, vars } from './css'

export type ThemeContract = Partial<typeof theme>

export const createTheme = function (selector: string, overrides: ThemeContract) {
  const mergedTheme = merge(theme, overrides)
  createGlobalTheme(selector, vars, mergedTheme)
}

export const initialize = function (themes?: { [selector: string]: ThemeContract }) {
  reset()

  globalStyle('html, body', {
    backgroundColor: vars.colors.onPrimary,
    color: vars.colors.onBackground,
    fontFamily: vars.fonts.sans,
    fontSize: calc.multiply(vars.fontSizes.root, vars.fontSizes.mobileResponsiveFactor),
    '@media': {
      [mediaBreakpointTablet]: {
        fontSize: vars.fontSizes.root,
      },
    },
  })

  if (themes) {
    Object.entries(themes).forEach(([selector, theme]) => {
      createTheme(selector, theme)
    })
  } else {
    createTheme(':root', theme)
  }
}

export { vars }
