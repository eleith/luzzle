#!/usr/bin/env node
/* v8 ignore start */

import { loadConfig } from '../lib/config-loader.js';
import { parseArgs } from './yargs.js';

console.log('Checking Luzzle configuration...');

const args = parseArgs();

try {
    loadConfig({ userConfigPath: args.config });

    console.log('✅ Configuration is valid.');
    process.exit(0);
} catch (error) {
    console.error('❌ Configuration check failed:', error);
    process.exit(1);
}
/* v8 ignore stop */
