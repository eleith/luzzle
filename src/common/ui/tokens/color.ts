import Color from 'color'

export const Modes = {
  light: 'light',
  dark: 'dark',
} as const

export type Mode = keyof typeof Modes
export type ModeColors = {
  background: string
  backgroundSecondary: string
  backgroundTertiary: string
  foreground: string
  primary: string
  primaryText: string
  primaryLink: string
  primaryLinkHover: string
  shadow: string
  text: string
  textShadow: string
  divider: string
}

const black = Color.rgb(0, 0, 0)
const white = Color.rgb(255, 255, 255)
const info = Color('#384d4b')
const success = Color('#7db94d')
const warning = Color('#fba915')
const danger = Color('#f44336')
const dark = Color('#292d39')
const light = Color('#ffffff')
const primary = Color('#ECD348')
const lightShade = Color('#F5F6F4')
const lightAccent = Color('#B29D93')
const darkShade = Color('#3C4A4F')
const darkAccent = Color('#C55B49')

const base = {
  black: black.string(),
  white: white.string(),
  info: info.string(),
  warning: warning.string(),
  success: success.string(),
  dark: dark.string(),
  light: light.string(),
  danger: danger.string(),
  lightShade: lightShade.string(),
  darkShade: darkShade.string(),
  lightAccent: lightAccent.string(),
  darkAccent: darkAccent.string(),
}

export type Colors = {
  base: typeof base
  [Modes.light]: ModeColors
  [Modes.dark]: ModeColors
}

export const colors: Colors = {
  base,
  [Modes.light]: {
    background: Color.rgb(0, 0, 0).string(),
    backgroundSecondary: Color.rgb(247, 247, 247).string(),
    backgroundTertiary: Color.rgb(247, 247, 247).string(),
    foreground: Color.rgb(0, 0, 0).string(),
    primary: Color.rgb(255, 214, 10).string(),
    primaryText: black.string(),
    primaryLink: primary.string(),
    primaryLinkHover: primary.string(),
    shadow: black.string(),
    text: black.string(),
    textShadow: white.darken(0.3).string(),
    divider: black.lighten(0.2).string(),
  },
  [Modes.dark]: {
    background: Color.rgb(20, 20, 20).string(),
    backgroundSecondary: Color.rgb(10, 10, 10).string(),
    backgroundTertiary: Color.rgb(20, 20, 20).string(),
    foreground: Color.rgb(255, 255, 255).string(),
    primary: Color.rgb(255, 214, 10).string(),
    primaryText: black.string(),
    primaryLink: primary.string(),
    primaryLinkHover: primary.desaturate(0.5).string(),
    shadow: black.string(),
    text: white.string(),
    textShadow: white.darken(0.7).string(),
    divider: white.darken(0.2).string(),
  },
}
