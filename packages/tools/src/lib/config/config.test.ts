import { describe, expect, test } from 'vitest';
import { readFileSync } from 'fs';
import * as path from 'path';
import { parse as yamlParse } from 'yaml';
import Ajv from 'ajv';

describe('lib/config', () => {
	test('should validate default config against schema', () => {
		// Read actual default config and schema files
		const defaultConfigContent = readFileSync(
			path.resolve(import.meta.dirname, 'config.defaults.yaml'),
			'utf8'
		);
		const schemaContent = readFileSync(
			path.resolve(import.meta.dirname, 'config.schema.json'),
			'utf8'
		);

		const defaultAppConfig = yamlParse(defaultConfigContent);
		const schema = JSON.parse(schemaContent);

		const ajv = new Ajv.default();
		const validate = ajv.compile(schema);

		expect(validate(defaultAppConfig)).toBe(true);
	});
});
