import { readFileSync, existsSync } from 'fs';
import * as path from 'path';
import { parse as yamlParse } from 'yaml';
import Ajv from 'ajv';
import { deepMerge } from './deep-merge.js';

// The AppConfig type is defined here as the single source of truth.
export type AppConfig = {
	url: {
		app: string
		app_assets: string
		luzzle_assets: string
		editor: string
	}
	text: {
		title: string
		description: string
	}
	paths: {
		database: string
	}
	content: {
		block: {
			root: string
			feed: string
		}
	}
	theme: {
		version: string
		globals: Record<string, string>
		light: Record<string, string>
		dark: Record<string, string>
	}
}

export type AppConfigPublic = {
	url: Pick<AppConfig['url'], 'app' | 'luzzle_assets' | 'app_assets'>
	text: AppConfig['text']
	theme: Pick<AppConfig['theme'], 'version'>
}

export function loadConfig(options?: { userConfigPath?: string }): AppConfig {
    // Use import.meta.url to get the current module's URL, then find the path on disk
    const __dirname = path.dirname(new URL(import.meta.url).pathname);

    const schemaPath = path.resolve(__dirname, 'config/config.schema.json');
    const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));

	const ajv = new Ajv.default()
	const validate = ajv.compile(schema)

	const defaultPath = path.resolve(__dirname, 'config/config.defaults.yaml')
    const defaultConfig = yamlParse(readFileSync(defaultPath, 'utf8')) as Partial<AppConfig>

    let userConfig: Partial<AppConfig> = {}

    if (options?.userConfigPath) {
        const userPath = path.resolve(options.userConfigPath);
        if (!existsSync(userPath)) {
            throw new Error(`User config file not found at: ${userPath}`);
        }
        userConfig = yamlParse(readFileSync(userPath, 'utf8')) as Partial<AppConfig>;
    }

	const mergedConfig = deepMerge(defaultConfig, userConfig) as AppConfig

	if (!validate(mergedConfig)) {
		throw new Error(`Configuration validation failed: ${ajv.errorsText(validate.errors)}`)
	}

	return mergedConfig;
}