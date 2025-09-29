/* v8 ignore start */
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

export function parseArgs() {
    return yargs(hideBin(process.argv))
        .strict()
        .options({
            output: {
                type: 'string',
                description: 'Path to the output directory',
            },
            config: {
                type: 'string',
                description: 'Path to a custom user config file',
            },
            minify: {
                type: 'boolean',
                description: 'Minify the generated CSS',
                default: false,
            },
        })
        .help()
        .parseSync();
}
/* v8 ignore stop */