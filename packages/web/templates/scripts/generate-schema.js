import { readFileSync, writeFileSync } from 'node:fs';
import { createInputSchema } from '@luzzle/web.config';
import { configSchema } from '../dist/config/index.js';

// Build-time editor asset, generated automatically by this package's postbuild.
const output = new URL('../config.schema.json', import.meta.url);
const schema = {
	$schema: 'http://json-schema.org/draft-07/schema#',
	...createInputSchema(configSchema)
};
const content = JSON.stringify(schema, null, 2) + '\n';

if (process.argv.includes('--check')) {
	if (readFileSync(output, 'utf8') !== content) {
		throw new Error('Template configuration schema is stale. Rebuild @luzzle/web.templates.');
	}
} else {
	writeFileSync(output, content);
}
