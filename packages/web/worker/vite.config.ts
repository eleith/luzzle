import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		exclude: ['dist/**', 'node_modules/**'],
		coverage: {
			thresholds: {
				lines: 70,
				branches: 70,
				statements: 70,
				functions: 70,
			},
			exclude: ['dist/**', 'node_modules/**', 'coverage/**', '**/*.d.ts', 'src/index.ts'],
		},
	},
})
