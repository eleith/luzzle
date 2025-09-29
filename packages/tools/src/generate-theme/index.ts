#!/usr/bin/env node
/* v8 ignore start */
import { writeFileSync, mkdirSync } from 'fs';
import * as path from 'path';
import { loadConfig } from '../lib/config-loader.js';
import { transform } from 'lightningcss';
import { Buffer } from 'buffer';
import { parseArgs } from './yargs.js';
import { generateThemeCss } from './theme.js';

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
/* v8 ignore stop */
