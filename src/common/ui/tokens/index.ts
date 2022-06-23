import { borderStyles, borderWidths, radii } from './border'
import { shadows } from './shadows'
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
  shadows,
  space,
}

export type { Mode, Colors, ModeColors } from './color'
export { colors, Modes } from './color'
export type Tokens = typeof tokens
