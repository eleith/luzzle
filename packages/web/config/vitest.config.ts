import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		exclude: ["dist/**", "node_modules/**"],
		coverage: {
			thresholds: {
				lines: 80,
				branches: 80,
				statements: 80,
				functions: 80,
			},
			exclude: [
				"scripts/**",
				"dist/**",
				"node_modules/**",
				"coverage/**",
				"eslint.config.js",
				"vitest.config.ts",
				"**/*.schema.ts",
				"**/*.d.ts",
			],
		},
	},
});

