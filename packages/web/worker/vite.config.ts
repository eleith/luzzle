import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		exclude: ['dist/**', 'node_modules/**'],
		coverage: {
			exclude: ['dist/**', 'node_modules/**', 'coverage/**', '**/*.d.ts', 'src/index.ts']
		}
	}
})
