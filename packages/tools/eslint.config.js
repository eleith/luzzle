import js from '@eslint/js'
import ts from 'typescript-eslint'
import prettier from 'eslint-config-prettier'
import globals from 'globals'
import { defineConfig, globalIgnores } from "eslint/config";

/** @type {import('eslint').Linter.Config[]} */
export default defineConfig([
	globalIgnores([
		"src/commands/opengraph/components/test.svelte",
		"src/commands/opengraph/components/test.svelte-hash.js",
	]),
	{
		linterOptions: {
			reportUnusedDisableDirectives: "off",
		}
	},
	js.configs.recommended,
	...ts.configs.recommended,
	prettier,
	{
		languageOptions: {
			globals: {
				...globals.node
			}
		}
	},
	{
		files: ['**/*.ts', '**/*.tsx'],
		languageOptions: {
			parserOptions: {
				parser: ts.parser
			}
		}
	},
])
