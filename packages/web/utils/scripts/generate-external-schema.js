import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const schemaPath = path.resolve(__dirname, '../src/lib/config/schema.json');

const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

/**
 * Recursively removes required fields that are present in defaults.
 */
function relax(s) {
	if (!s || typeof s !== 'object') return;

	if (s.type === 'object' && s.properties) {
		if (s.required) {
			s.required = s.required.filter((key) => {
				const prop = s.properties[key];
				// If property has a default, it's not strictly required from the user
				return prop && prop.default === undefined;
			});
			if (s.required.length === 0) delete s.required;
		}
		for (const key in s.properties) {
			relax(s.properties[key]);
		}
	}

	// Handle nested schemas (allOf, anyOf, oneOf, then, else)
	const nestedKeys = ['allOf', 'anyOf', 'oneOf', 'then', 'else'];
	for (const key of nestedKeys) {
		if (s[key]) {
			if (Array.isArray(s[key])) {
				s[key].forEach((item) => relax(item));
			} else {
				relax(s[key]);
			}
		}
	}
}

relax(schema);

console.log(JSON.stringify(schema, null, 2));
