import { describe, test, vi, afterEach, expect } from 'vitest';
import { generatePng } from './png.js';
import { Browser } from 'puppeteer';

vi.mock('puppeteer');

describe('generate-open-graph/png', () => {
	const mocks = {
		newPage: vi.fn(),
		setViewport: vi.fn(),
		setContent: vi.fn(),
		screenshot: vi.fn(),
		close: vi.fn(),
	};

	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset();
		});
	});

	test('should generate a PNG image', async () => {
		mocks.screenshot.mockResolvedValue(Buffer.from('test'));
		const browser = {
			newPage: mocks.newPage.mockResolvedValue({
				setViewport: mocks.setViewport,
				setContent: mocks.setContent,
				screenshot: mocks.screenshot,
				close: mocks.close,
			}),
		} as unknown as Browser;

		const imageBuffer = await generatePng('<html></html>', browser);

		expect(imageBuffer).toBeDefined();
		expect(mocks.newPage).toHaveBeenCalledOnce();
		expect(mocks.setViewport).toHaveBeenCalledOnce();
		expect(mocks.setContent).toHaveBeenCalledOnce();
		expect(mocks.screenshot).toHaveBeenCalledOnce();
		expect(mocks.close).toHaveBeenCalledOnce();
	});

	test('should throw an error if screenshot fails', async () => {
		mocks.screenshot.mockRejectedValue(new Error('test error'));
		const browser = {
			newPage: mocks.newPage.mockResolvedValue({
				setViewport: mocks.setViewport,
				setContent: mocks.setContent,
				screenshot: mocks.screenshot,
				close: mocks.close,
			}),
		} as unknown as Browser;

		await expect(generatePng('<html></html>', browser)).rejects.toThrowError()
		expect(mocks.close).toHaveBeenCalledOnce();
	});
});
