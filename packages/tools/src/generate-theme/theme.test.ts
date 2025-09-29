import { describe, test, expect } from 'vitest';
import { generateThemeCss } from './theme.js';
import { AppConfig } from '../lib/config-loader.js';

describe('generate-theme/theme', () => {
	test('should generate theme CSS', () => {
		const config: AppConfig = {
			url: { app: '', app_assets: '', luzzle_assets: '', editor: '' },
			text: { title: '', description: '' },
			paths: { database: '' },
			content: { block: { root: '', feed: '' } },
			theme: {
				version: '1.0.0',
				globals: {
					'font-sans-name': 'Test Sans',
					'font-sans-weight': '400',
					'font-sans-url': '/test.woff2',
				},
				light: {
					'colors-primary': '#000000',
				},
				dark: {
					'colors-primary': '#ffffff',
				},
			},
		};

		const css = generateThemeCss(config);

		expect(css).toContain('--font-sans-name: "Test Sans";');
		expect(css).toContain('--colors-primary: #000000;');
		expect(css).toContain('--colors-primary: #ffffff;');
	});
});