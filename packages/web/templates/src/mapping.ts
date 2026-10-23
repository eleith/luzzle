import { getFrontmatterValue, type PieceFrontmatter } from '@luzzle/core';
import type { FieldMapping, FieldMappings } from '@luzzle/web.config/mapping';

/** Resolve a presentation model without changing the piece metadata or configuration. */
export function resolveTemplateFields(
	metadata: PieceFrontmatter,
	mapping: FieldMappings = {}
): Record<string, unknown> {
	return structuredClone(resolveFields(metadata, mapping));
}

function resolveFields(data: unknown, fields: FieldMappings, parent = ''): Record<string, unknown> {
	return Object.fromEntries(
		Object.entries(fields)
			.map(([name, mapping]) => {
				const path = parent ? `${parent}.${name}` : name;
				return [name, resolveField(data, mapping, path)] as const;
			})
			.filter(([, value]) => value !== undefined)
	);
}

function resolveField(data: unknown, mapping: FieldMapping, path: string): unknown {
	if (typeof mapping === 'string') return select(data, mapping, path);
	if ('field' in mapping) {
		const value = select(data, mapping.field, path);
		return value === undefined ? mapping.default : value;
	}
	if ('value' in mapping) return mapping.value;
	if ('each' in mapping) {
		const items = select(data, mapping.each, path);
		if (items === undefined) return [];
		if (!Array.isArray(items)) {
			throw new Error(`Template field "${path}" expects an array at "${mapping.each}"`);
		}
		return items.map((item, index) => resolveFields(item, mapping.fields, `${path}[${index}]`));
	}
	return resolveFields(data, mapping.fields, path);
}

function select(data: unknown, selector: string, path: string): unknown {
	if (selector === '$') return data;
	if (data === null || typeof data !== 'object') return undefined;
	try {
		return getFrontmatterValue(data as PieceFrontmatter, selector);
	} catch (error) {
		throw new Error(`Invalid selector "${selector}" for template field "${path}"`, {
			cause: error
		});
	}
}
