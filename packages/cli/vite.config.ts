import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		exclude: ['generated/**', 'dist/**', 'build/**', 'node_modules/**'],
		coverage: {
			thresholds: {
				lines: 92,
				branches: 92,
				statements: 92,
				functions: 92,
			},
			exclude: [
				'generated/**',
				'dist/**',
				'build/**',
				'node_modules/**',
				'**/*{.,-}fixtures.{js,cjs,mjs,ts,tsx,jsx}',
				'coverage/**',
				'packages/*/test{,s}/**',
				'**/*.d.ts',
				'cypress/**',
				'test{,s}/**',
				'test{,-*}.{js,cjs,mjs,ts,tsx,jsx}',
				'**/*{.,-}test.{js,cjs,mjs,ts,tsx,jsx}',
				'**/__tests__/**',
				'**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc}.config.{js,cjs,mjs,ts}',
				'**/.{eslint,mocha,prettier}rc.{js,cjs,yml}',
			],
		},
	},
})