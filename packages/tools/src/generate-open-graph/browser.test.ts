import { describe, test, vi, afterEach, expect } from 'vitest';
import puppeteer, { Browser } from 'puppeteer';

vi.mock('puppeteer');

describe('generate-open-graph/browser', () => {
	const mocks = {
		launch: vi.mocked(puppeteer.launch),
	};

	afterEach(() => {
		vi.resetModules();
		Object.values(mocks).forEach((mock) => {
			mock.mockReset();
		});
	});

	test('should initialize and return a browser instance', async () => {
		const { getBrowser } = await import('./browser.js');
		mocks.launch.mockResolvedValue({ connected: true } as unknown as Browser);

		const browser = await getBrowser();

		expect(mocks.launch).toHaveBeenCalledOnce();
		expect(browser).toBeDefined();
	});

	test('should return the existing browser instance', async () => {
		const { getBrowser } = await import('./browser.js');
		mocks.launch.mockResolvedValue({ connected: true } as unknown as Browser);

		const browser1 = await getBrowser();
		const browser2 = await getBrowser();

		expect(mocks.launch).toHaveBeenCalledOnce();
		expect(browser1).toBe(browser2);
	});
});
