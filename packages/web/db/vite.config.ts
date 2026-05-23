import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		exclude: ['dist/**', 'node_modules/**'],
		coverage: {
			exclude: [
				'eslint.config.js',
				'dist/**',
				'node_modules/**',
				'src/migrations/**',
				'**/*{.,-}fixtures.{js,cjs,mjs,ts,tsx,jsx}',
				'coverage/**',
				'packages/*/test{,s}/**',
				'**/*.d.ts',
				'**/*.mock.ts',
				'**/*.schema.ts',
				'**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc}.config.{js,cjs,mjs,ts}',
				'**/.{eslint,mocha,prettier}rc.{js,cjs,yml}',
			],
		},
	},
})
