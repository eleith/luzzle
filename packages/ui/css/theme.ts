import { createGlobalThemeContract } from '@vanilla-extract/css'
import { colors } from './color'
import { shadows } from './shadows'
import { fonts, fontSizes, fontWeights } from './typography'
import { radii } from './border'
import { breakpoints } from './breakpoints'
import { space } from './space'

const getVarName = (_value: string | null, path: string[]): string =>
  path.join('-').replace('.', '_').replace('/', '__')

export const theme = { colors, shadows, fonts, fontSizes, fontWeights, radii, breakpoints, space }
export const themeContract = createGlobalThemeContract(theme, getVarName)
