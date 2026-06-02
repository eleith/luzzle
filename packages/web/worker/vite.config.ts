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
				'dist/**',
				'node_modules/**',
				'coverage/**',
				'**/*.d.ts',
				'src/index.ts',
				'src/pieces/.compiled/**',
				'src/api/**',
				'src/transforms/utils/types.ts',
				'src/transforms/markdown/engine.ts',
				'src/transforms/markdown/remark-gfm.ts',
				'src/transforms/markdown/remark-sidenotes.ts',
				'src/workflows/**',
				'eslint.config.js',
				'vite.config.ts',
			],
		},
	},
})
