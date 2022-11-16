import { createGlobalTheme, globalStyle } from '@vanilla-extract/css'
import { varsContract, reset, tokens, theme, themeContract, vars } from './css'

export type ThemeContract = typeof theme

export const createTheme = function (selector: string, theme: ThemeContract) {
  createGlobalTheme(selector, themeContract, theme)
}

export const initialize = function (themes?: { [selector: string]: ThemeContract }) {
  reset()

  globalStyle('html, body', {
    backgroundColor: vars.colors.onPrimary,
    color: vars.colors.onBackground,
    fontFamily: vars.fonts.sans,
  })

  createGlobalTheme(':root', varsContract, tokens)

  if (themes) {
    Object.entries(themes).forEach(([selector, theme]) => {
      createTheme(selector, theme)
    })
  } else {
    createTheme(':root', theme)
  }
}
