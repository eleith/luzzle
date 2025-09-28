#!/usr/bin/env node
import { loadConfig } from '../lib/config-loader.js';
import { parseArgs } from './yargs.js';

console.log('Checking Luzzle configuration...');

const args = parseArgs();

try {
    // The config loader is now self-contained and doesn't need a projectRoot.
    // We just pass the optional user config path.
    loadConfig({ userConfigPath: args.config });

    console.log('✅ Configuration is valid.');
    
    process.exit(0);
} catch (error) {
    console.error('❌ Configuration check failed:');
    if (error instanceof Error) {
        console.error(error.message);
    } else {
        console.error(error);
    }
    process.exit(1);
}

