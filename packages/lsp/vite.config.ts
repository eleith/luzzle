import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		exclude: ['dist/**', 'node_modules/**'],
		coverage: {
			thresholds: {
				lines: 80,
				branches: 80,
				statements: 80,
				functions: 80,
			},
			exclude: [
				'eslint.config.js',
				'dist/**',
				'node_modules/**',
				'**/*.d.ts',
				'**/*{.,-}test.{js,cjs,mjs,ts,tsx,jsx}',
				'**/{vite,vitest}.config.{js,cjs,mjs,ts}',
				'src/index.ts',
			],
		},
	},
})
