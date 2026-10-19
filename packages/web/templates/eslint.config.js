import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import svelte from 'eslint-plugin-svelte';
import ts from 'typescript-eslint';
import globals from 'globals';

export default [
	{ ignores: ['dist/**', 'node_modules/**'] },
	js.configs.recommended,
	...svelte.configs['flat/recommended'],
	...ts.configs.recommended.map((config) => ({ ...config, files: ['**/*.ts'] })),
	prettier,
	...svelte.configs['flat/prettier'],
	{ languageOptions: { globals: globals.node } }
];
