import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		include: ['src/**/*.{test,spec}.{ts,js}', 'scripts/**/*.{test,spec}.{ts,js}'],
		exclude: ['build/**', '.svelte-kit/**', 'node_modules/**']
	}
})
