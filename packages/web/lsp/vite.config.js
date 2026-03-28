import { defineConfig } from 'vitest/config'

export default defineConfig({
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
