import { borderStyles, borderWidths, radii } from './border'
import { opacity } from './opacity'
import { space } from './space'
import { fontSizes, fontWeights, fonts, letterSpacings, lineHeights } from './typography'

export const tokens = {
  borderStyles,
  borderWidths,
  fonts,
  fontSizes,
  fontWeights,
  letterSpacings,
  lineHeights,
  opacity,
  radii,
  space,
}

export type { Mode, Colors, ModeColors } from './color'
export { colors, Modes } from './color'
export { shadows } from './shadows'
export type Tokens = typeof tokens
