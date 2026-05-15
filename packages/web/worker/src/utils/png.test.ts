import { describe, test, vi, afterEach, expect } from 'vitest';
import { generatePngFromUrl } from './png.js';
import { Browser } from 'puppeteer';

vi.mock('puppeteer');

describe('lib/utils/png', () => {
	const mocks = {
		newPage: vi.fn(),
		setViewport: vi.fn(),
		setContent: vi.fn(),
		goto: vi.fn(),
		screenshot: vi.fn(),
		close: vi.fn(),
	};

	const okResponse = { ok: () => true, status: () => 200, statusText: () => 'OK' };

	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset();
		});
	});

	test('should generate a PNG image', async () => {
		mocks.goto.mockResolvedValue(okResponse);
		mocks.screenshot.mockResolvedValue(Buffer.from('test'));
		const browser = {
			newPage: mocks.newPage.mockResolvedValue({
				setViewport: mocks.setViewport,
				goto: mocks.goto,
				screenshot: mocks.screenshot,
				close: mocks.close,
			}),
		} as unknown as Browser;

		const imageBuffer = await generatePngFromUrl('http://localhost', browser, '');

		expect(imageBuffer).toBeDefined();
		expect(mocks.newPage).toHaveBeenCalledOnce();
		expect(mocks.setViewport).toHaveBeenCalledOnce();
		expect(mocks.goto).toHaveBeenCalledOnce();
		expect(mocks.screenshot).toHaveBeenCalledOnce();
		expect(mocks.close).toHaveBeenCalledOnce();
	});

	test('should throw an error if screenshot fails', async () => {
		mocks.goto.mockResolvedValue(okResponse);
		mocks.screenshot.mockRejectedValue(new Error('test error'));
		const browser = {
			newPage: mocks.newPage.mockResolvedValue({
				setViewport: mocks.setViewport,
				goto: mocks.goto,
				screenshot: mocks.screenshot,
				close: mocks.close,
			}),
		} as unknown as Browser;

		await expect(generatePngFromUrl('http://localhost', browser, '')).rejects.toThrowError()
		expect(mocks.close).toHaveBeenCalledOnce();
	});

	test('should throw when navigation returns non-2xx', async () => {
		mocks.goto.mockResolvedValue({ ok: () => false, status: () => 403, statusText: () => 'Forbidden' });
		const browser = {
			newPage: mocks.newPage.mockResolvedValue({
				setViewport: mocks.setViewport,
				goto: mocks.goto,
				screenshot: mocks.screenshot,
				close: mocks.close,
			}),
		} as unknown as Browser;

		await expect(generatePngFromUrl('http://localhost', browser, '')).rejects.toThrow(/403/);
		expect(mocks.screenshot).not.toHaveBeenCalled();
		expect(mocks.close).toHaveBeenCalledOnce();
	});

	test('should throw when goto returns null response', async () => {
		mocks.goto.mockResolvedValue(null);
		const browser = {
			newPage: mocks.newPage.mockResolvedValue({
				setViewport: mocks.setViewport,
				goto: mocks.goto,
				screenshot: mocks.screenshot,
				close: mocks.close,
			}),
		} as unknown as Browser;

		await expect(generatePngFromUrl('http://localhost', browser, '')).rejects.toThrow(/no response/);
		expect(mocks.screenshot).not.toHaveBeenCalled();
		expect(mocks.close).toHaveBeenCalledOnce();
	});
});
