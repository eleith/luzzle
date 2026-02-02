const js = require('@eslint/js')
const prettier = require('eslint-config-prettier')
const globals = require('globals')

module.exports = [
	js.configs.recommended,
	prettier,
	{
		languageOptions: {
			globals: {
				...globals.node,
			},
			ecmaVersion: 2022,
			sourceType: 'module',
		},
		rules: {
			'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
			'no-console': 'off',
		},
	},
]