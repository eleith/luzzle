import merge from 'deepmerge'
import { createGlobalTheme, createGlobalThemeContract } from '@vanilla-extract/css'
import { tokens, colors, shadows } from '../tokens'

const getVarName = (_value: string | null, path: string[]): string =>
  path.join('-').replace('.', '_').replace('/', '__')

const baseVarsContract = createGlobalThemeContract(tokens, getVarName)
const colorLightScheme = { colors: { ...colors.light }, shadows: { ...shadows.light } }
const colorDarkScheme = { colors: { ...colors.dark }, shadows: { ...shadows.dark } }
const colorVarsContract = createGlobalThemeContract(colorLightScheme, getVarName)

createGlobalTheme(':root', baseVarsContract, tokens)
createGlobalTheme('[data-theme="light"]', colorVarsContract, colorLightScheme)
createGlobalTheme('[data-theme="dark"]', colorVarsContract, colorDarkScheme)

export const vars = merge(baseVarsContract, colorVarsContract)
