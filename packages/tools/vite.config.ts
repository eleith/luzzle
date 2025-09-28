import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		exclude: ['generated/**', 'dist/**', 'build/**', 'node_modules/**'],
		coverage: {
			thresholds: {
				lines: 80,
				branches: 80,
				statements: 80,
				functions: 80,
			},
			exclude: [
				'**/*.fixtures.ts',
				'**/*.mock.ts',
				'src/index.ts',
				'src/version.ts',
				'coverage/**',
				'dist/**',
				'**/node_modules/**',
				'**/[.]**',
				'packages/*/test?(s)/**',
				'**/*.d.ts',
				'**/virtual:*',
				'**/__x00__*',
				'**/\x00*',
				'cypress/**',
				'test?(s)/**',
				'test?(-*).?(c|m)[jt]s?(x)',
				'**/*{.,-}{test,spec,bench,benchmark}?(-d).?(c|m)[jt]s?(x)',
				'**/__tests__/**',
				'**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*',
				'**/vitest.{workspace,projects}.[jt]s?(on)',
				'**/.{eslint,mocha,prettier}rc.{?(c|m)js,yml}',
			],
		},
	},
})
