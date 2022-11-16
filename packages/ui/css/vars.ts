import merge from 'deepmerge'
import { createGlobalThemeContract } from '@vanilla-extract/css'
import { borderStyles, borderWidths, radii } from './border'
import { opacity } from './opacity'
import { space } from './space'
import { fontSizes, fontWeights, fonts, letterSpacings, lineHeights } from './typography'
import { themeContract } from './theme'

const getVarName = (_value: string | null, path: string[]): string =>
  path.join('-').replace('.', '_').replace('/', '__')

const tokens = {
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

const varsContract = createGlobalThemeContract(tokens, getVarName)
const vars = merge(varsContract, themeContract)

export { vars, varsContract, getVarName, tokens }
