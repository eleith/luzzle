import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
	testDir: './e2e',
	testMatch: '**/*.e2e.ts',
	workers: 1,
	retries: 0,
	forbidOnly: !!process.env.CI,
	outputDir: './test-results',
	use: {
		timezoneId: 'UTC',
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure'
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
})
