import { createGlobalThemeContract } from '@vanilla-extract/css'
import { colors } from './color'
import { shadows } from './shadows'

const getVarName = (_value: string | null, path: string[]): string =>
  path.join('-').replace('.', '_').replace('/', '__')

export const theme = { colors, shadows }
export const themeContract = createGlobalThemeContract(theme, getVarName)
