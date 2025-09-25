import { config } from './config-loader.js';

const key = process.argv[2];

if (!key) {
    // Exit gracefully with no output if no key is provided.
    process.exit(0);
}

// Navigate the config object using the dot-notation key
const value = key.split('.').reduce((obj, k) => (obj && obj[k] !== undefined) ? obj[k] : undefined, config);

if (value !== undefined) {
    // The only output to stdout should be the final value.
    console.log(value);
}
