import fs from 'fs'
import path from 'path'
import YAML from 'yaml'
import { deepMerge } from './deep-merge.js'

// --- Read and Merge Configs ---
const defaultConfigPath = path.resolve(process.cwd(), './config/config.defaults.yaml')
const userConfigPath = process.env.LUZZLE_CONFIG_PATH
	? path.resolve(process.env.LUZZLE_CONFIG_PATH)
	: path.resolve(process.cwd(), './config/config.yaml')

const defaultConfigString = fs.readFileSync(defaultConfigPath, 'utf8')
const defaultConfig = YAML.parse(defaultConfigString)

const userConfigExists = fs.existsSync(userConfigPath)
const userConfigString = userConfigExists ? fs.readFileSync(userConfigPath, 'utf8') : ''
const userConfig = userConfigExists ? YAML.parse(userConfigString) : {}

export const config = deepMerge(defaultConfig, userConfig)
