import { getFrontmatterValue } from '@luzzle/core';
import { ConfigError } from '@luzzle/web.config';
import type { FieldMapping, FieldMappings } from '@luzzle/web.config/mapping';
import type { TemplateConfig } from './index.js';

function checkSelector(selector: string, path: string): void {
	try {
		getFrontmatterValue({}, selector);
	} catch {
		throw new ConfigError([{ path, message: `Invalid metadata selector: ${selector}` }]);
	}
}

function checkMapping(mapping: FieldMapping, path: string): void {
	if (typeof mapping === 'string') return checkSelector(mapping, path);
	if ('field' in mapping) return checkSelector(mapping.field, `${path}/field`);
	if ('each' in mapping) checkSelector(mapping.each, `${path}/each`);
	if ('fields' in mapping) checkFields(mapping.fields, `${path}/fields`);
}

function checkFields(fields: FieldMappings, path: string): void {
	for (const [name, mapping] of Object.entries(fields)) {
		if (mapping === undefined) continue;
		const token = name.replaceAll('~', '~0').replaceAll('/', '~1');
		checkMapping(mapping, `${path}/${token}`);
	}
}

/** Invalid configuration must fail at startup, not become a per-record fallback. */
export function validateTemplateSelectors(config: TemplateConfig): void {
	for (const [index, piece] of config.pieces.entries()) {
		for (const role of ['icon', 'page', 'opengraph'] as const) {
			checkFields(
				piece.templates?.[role].mapping ?? {},
				`/pieces/${index}/templates/${role}/mapping`
			);
		}
	}
}
