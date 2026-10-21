import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		fileParallelism: false,
		include: ['test/templates/**/*.test.ts'],
		testTimeout: 30000,
		hookTimeout: 60000
	}
})
