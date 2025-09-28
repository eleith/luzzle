#!/usr/bin/env node
import { writeFileSync, mkdirSync } from 'fs';
import * as path from 'path';
import { loadConfig, type AppConfig } from '../lib/config-loader.js';
import { transform } from 'lightningcss';
import { Buffer } from 'buffer';
import { parseArgs } from './yargs.js';

const args = parseArgs();
const config = loadConfig({ userConfigPath: args.config });

function minifyCss(css: string): string {
    try {
        const { code } = transform({
            filename: 'theme.css',
            code: Buffer.from(css),
            minify: true
        });
        return code.toString();
    } catch (error) {
        console.error('Error minifying CSS with Lightning CSS:', error);
        return css;
    }
}

const createCssVariableBlock = (variables: Record<string, string>) => {
	return Object.entries(variables)
		.map(([key, value]) => {
			if (/font.*name/.test(key) || /url/.test(key)) {
				return `	--${key}: "${value}";`
			}
			return `	--${key}: ${value};`
		})
		.join('\n')
}

const generateThemeCss = (config: AppConfig) => {
	const themeConfig = config.theme || {}

	const globalsBlock = createCssVariableBlock(themeConfig.globals || {})
	const lightBlock = createCssVariableBlock(themeConfig.light || {})
	const darkBlock = createCssVariableBlock(themeConfig.dark || {})
	return `
html {
${globalsBlock}
}

html[data-theme='light'] {
${lightBlock}
}

html[data-theme='dark'] {
${darkBlock}
}

@font-face {
	font-family: "${config.theme.globals['font-sans-name']}";
	font-optical-sizing: auto;
	font-weight: ${config.theme.globals['font-sans-weight']};
	font-style: normal;
	font-variation-settings: 'wdth' 300;
	src: url("${config.theme.globals['font-sans-url']}") format('woff2');
	font-display: swap;
}

@font-face {
	font-family: 'Adjusted Sans';
	src: local(Dejavu Sans), local(Verdana), sans-serif;
	size-adjust: 92%;
}

html {
	font-family: var(--font-sans-name), 'Adjusted Sans';
}

@media (prefers-color-scheme: dark) {
	html:not([data-theme='light']) {
${darkBlock}
	}
}
`
}

const rawCss = generateThemeCss(config);
const themeCss = args.minify ? minifyCss(rawCss) : rawCss;

if (args.output) {
    const outputDir = path.resolve(process.cwd(), args.output);
    const themeVersion = config.theme.version;
    const outputPath = path.join(outputDir, `theme.${themeVersion}.css`);
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(outputPath, themeCss);
    console.log(`Theme CSS generated at: ${outputPath}`);
} else {
    console.log(themeCss);
}
