import js from '@eslint/js'
import ts from 'typescript-eslint'
import svelte from 'eslint-plugin-svelte'
import prettier from 'eslint-config-prettier'
import globals from 'globals'
import { loadConfig } from '@sveltejs/load-config'

const loadedConfig = await loadConfig(import.meta.dirname, { traverse: false })
if (!loadedConfig) throw new Error('Svelte configuration not found')
if ('error' in loadedConfig) throw loadedConfig.error
const svelteConfig = loadedConfig.config

/** @type {import('eslint').Linter.Config[]} */
export default [
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs['flat/recommended'],
	prettier,
	...svelte.configs['flat/prettier'],
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node
			}
		},
		rules: {
			// Adopt these newly recommended rules in the final lint-cleanup commit.
			'svelte/no-navigation-without-resolve': 'off',
			'svelte/prefer-svelte-reactivity': 'off',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_'
				}
			]
		}
	},
	{
		files: ['**/*.svelte'],
		languageOptions: {
			parserOptions: {
				parser: ts.parser,
				svelteConfig
			}
		}
	},
	{
		ignores: [
			'build/',
			'.svelte-kit/',
			'docker-compose.yml',
			'src/lib/pieces/components/custom/',
			'src/lib/content/components/custom/',
			'demo/content/',
			'demo/archive/',
			'demo/data/',
			'demo/assets/'
		]
	},
	{
		rules: {
			'@typescript-eslint/consistent-type-imports': [
				'error',
				{
					prefer: 'type-imports',
					fixStyle: 'separate-type-imports'
				}
			]
		}
	}
]
