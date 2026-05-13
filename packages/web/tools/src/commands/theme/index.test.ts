import { describe, test, vi, afterEach, expect, MockInstance } from 'vitest';
import generateTheme from './index.js';
import { type Config } from '@luzzle/web.config';
import { getConfig } from '../../lib/config.js';
import { generateThemeCss, minifyCss } from './theme.js';
import { mkdir, writeFile } from 'fs/promises';

vi.mock('../../lib/config.js');
vi.mock('fs/promises');
vi.mock('./theme.js');

const mocks = {
	getConfig: vi.mocked(getConfig),
	generateThemeCss: vi.mocked(generateThemeCss),
	minifyCss: vi.mocked(minifyCss),
	mkdir: vi.mocked(mkdir),
	writeFile: vi.mocked(writeFile),
};

const spies: { [key: string]: MockInstance } = {};

describe('src/commands/theme', () => {
	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset();
		});
		Object.keys(spies).forEach((key) => {
			spies[key].mockRestore();
			delete spies[key];
		});
	});

	test('should generate theme to stdout', async () => {
		spies.consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
		const config = { theme: {} } as Config;
		mocks.getConfig.mockReturnValue(config);
		mocks.generateThemeCss.mockReturnValue('body { color: red; }');

		await generateTheme(config);

		expect(mocks.generateThemeCss).toHaveBeenCalledOnce();
		expect(spies.consoleLog).toHaveBeenCalledWith('body { color: red; }');
	});

	test('should generate minified theme to stdout', async () => {
		spies.consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
		const config = { theme: {} } as Config;
		mocks.getConfig.mockReturnValue(config);
		mocks.generateThemeCss.mockReturnValue('body { color: red; }');
		mocks.minifyCss.mockReturnValue('body{color:red}');

		await generateTheme(config, true);

		expect(mocks.minifyCss).toHaveBeenCalledOnce();
		expect(spies.consoleLog).toHaveBeenCalledWith('body{color:red}');
	});
});
