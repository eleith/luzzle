import fs from 'fs'
import path from 'path'
import YAML from 'yaml'
import Ajv from 'ajv'
import schema from '../config/config.schema.json' with { type: 'json' }

// This deepMerge function is duplicated from src/lib/server/config.ts
function deepMerge(target, source) {
	const output = { ...target }

	for (const key in source) {
		if (Object.prototype.hasOwnProperty.call(source, key)) {
			const targetValue = output[key]
			const sourceValue = source[key]

			if (
				sourceValue instanceof Object &&
				!Array.isArray(sourceValue) &&
				targetValue instanceof Object &&
				!Array.isArray(targetValue)
			) {
				output[key] = deepMerge(targetValue, sourceValue)
			} else {
				output[key] = sourceValue
			}
		}
	}
	return output
}

function loadYamlFile(filePath) {
	if (!fs.existsSync(filePath)) {
		return null
	}
	const content = fs.readFileSync(filePath, 'utf8')
	return YAML.parse(content)
}

function validateConfig(
	config,
	validator,
	ajvInstance,
	configName,
	suppressSuccessMessage = false
) {
	if (!validator(config)) {
		console.error(`\n❌ ${configName} is invalid:`)
		validator.errors.forEach((err) => {
			console.error(
				`  - Field: ${err.instancePath || '/'}${err.keyword === 'required' && err.params && err.params.missingProperty ? ` (missing: ${err.params.missingProperty})` : ''}`
			)
			console.error(`    Message: ${err.message}`)
			if (err.schemaPath) {
				console.error(`    Schema Path: ${err.schemaPath}`)
			}
			if (err.params && Object.keys(err.params).length > 0) {
				console.error(`    Params: ${JSON.stringify(err.params)}`)
			}
		})
		return false
	}
	if (!suppressSuccessMessage) {
		console.log(`✅ ${configName} is valid.`)
	}
	return true
}

function runConfigCheck() {
	console.log('Checking Luzzle Explorer configuration...')

	const ajv = new Ajv({ allErrors: true })
	const validator = ajv.compile(schema)
	let hasErrors = false

	const args = process.argv.slice(2) // Skip 'node' and 'script_name.js'

	let customUserConfigPath = null
	const fileArgIndex = args.indexOf('--file')
	if (fileArgIndex > -1 && args[fileArgIndex + 1]) {
		customUserConfigPath = args[fileArgIndex + 1]
	}

	const defaultUserConfigPath = path.resolve(process.cwd(), './config/config.yaml')
	const userPathEnv = process.env.LUZZLE_CONFIG_PATH

	const actualUserConfigPath = customUserConfigPath || userPathEnv || defaultUserConfigPath

	const defaultConfigPath = path.resolve(process.cwd(), './config/config.defaults.yaml')
	const defaultConfig = loadYamlFile(defaultConfigPath)
	if (!defaultConfig) {
		console.error(`\n❌ Default configuration file not found: ${defaultConfigPath}`)
		process.exit(1)
	}

	// --- Core Logic ---
	if (customUserConfigPath) {
		// If --file is present
		// Scenario: Check merged config with a specified file
		// Always validate default config, but suppress its success message
		if (
			!validateConfig(
				defaultConfig,
				validator,
				ajv,
				'Default configuration (config.defaults.yaml)',
				true
			)
		) {
			hasErrors = true
		}

		const userConfig = loadYamlFile(actualUserConfigPath)
		if (userConfig) {
			const mergedConfig = deepMerge(defaultConfig, userConfig)
			if (
				!validateConfig(
					mergedConfig,
					validator,
					ajv,
					`Merged configuration (config.defaults.yaml + ${actualUserConfigPath})`
				)
			) {
				hasErrors = true
			}
		} else {
			console.error(`\n❌ User configuration file not found: ${actualUserConfigPath}`)
			process.exit(1) // Exit if --file was specified but file not found
		}
	} else {
		// If no --file is present (implicitly check default)
		// Scenario: Check default and suggest --file
		if (
			!validateConfig(defaultConfig, validator, ajv, 'Default configuration (config.defaults.yaml)')
		) {
			hasErrors = true
		}
		console.log(
			'\nℹ️ To check your user configuration, run: npm run check:config -- --file <path/to/config.yaml>'
		)
		console.log('   (e.g., npm run check:config -- --file config/config.yaml)')
	}
	// --- End Core Logic ---

	if (hasErrors) {
		console.error('\nConfiguration check failed.')
		process.exit(1)
	} else {
		console.log('\nConfiguration check passed!')
		process.exit(0)
	}
}

runConfigCheck()
