const { defineConfig } = require('vitest/config')

module.exports = defineConfig({
	test: {
		environment: 'node',
		coverage: {
			provider: 'v8',
			thresholds: {
				lines: 75,
				branches: 75,
				statements: 75,
				functions: 75,
			},
		},
	},
})
