import merge from 'deepmerge'
import { createGlobalTheme, createGlobalThemeContract } from '@vanilla-extract/css'
import { tokens, colors } from '../tokens'

const getVarName = (_value: string | null, path: string[]): string =>
  path.join('-').replace('.', '_').replace('/', '__')

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const baseVarsContract = createGlobalThemeContract(tokens, getVarName)
const colorLightScheme = { colors: { ...colors.light } }
const colorDarkScheme = { colors: { ...colors.dark } }
const colorVarsContract = createGlobalThemeContract(colorLightScheme, getVarName)

createGlobalTheme(':root', baseVarsContract, tokens)
createGlobalTheme('[data-theme="light"]', colorVarsContract, colorLightScheme)
createGlobalTheme('[data-theme="dark"]', colorVarsContract, colorDarkScheme)

export const vars = merge(baseVarsContract, colorVarsContract)
