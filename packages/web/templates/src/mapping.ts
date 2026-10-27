import { getFrontmatterValue, type PieceFrontmatter } from '@luzzle/core';
import type { FieldMapping, FieldMappings } from '@luzzle/web.config/mapping';
import type { Static, TObject } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';

export class TemplateFieldsError extends Error {}

/** Validate mapped values against the selected template's own field contract. */
export function mapTemplateFields<Schema extends TObject>(
	schema: Schema,
	metadata: PieceFrontmatter,
	mapping: FieldMappings = {}
): Static<Schema> {
	const fields = Value.Default(schema, resolveTemplateFields(metadata, mapping));
	if (!Value.Check(schema, fields)) {
		const paths = [...Value.Errors(schema, fields)].map((issue) => issue.path).join(', ');
		throw new TemplateFieldsError(`Invalid mapped fields: ${paths}`);
	}
	return fields;
}

/** Map field bindings without changing the piece metadata or configuration. */
export function resolveTemplateFields(
	metadata: PieceFrontmatter,
	mapping: FieldMappings = {}
): Record<string, unknown> {
	return structuredClone(resolveFields(metadata, mapping));
}

function resolveFields(data: unknown, fields: FieldMappings, parent = ''): Record<string, unknown> {
	return Object.fromEntries(
		Object.entries(fields).flatMap(([name, mapping]) => {
			if (mapping === undefined) return [];
			const path = parent ? `${parent}.${name}` : name;
			const value = resolveField(data, mapping, path);
			return value === undefined ? [] : [[name, value]];
		})
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
			throw new TemplateFieldsError(
				`Template field "${path}" expects an array at "${mapping.each}"`
			);
		}
		return items.map((item, index) => resolveFields(item, mapping.fields, `${path}[${index}]`));
	}
	return resolveFields(data, mapping.fields, path);
}

function select(data: unknown, selector: string, path: string): unknown {
	if (selector === '$') return data ?? undefined;
	if (data === null || typeof data !== 'object') return undefined;
	try {
		return getFrontmatterValue(data as PieceFrontmatter, selector) ?? undefined;
	} catch (error) {
		throw new Error(`Invalid selector "${selector}" for template field "${path}"`, {
			cause: error
		});
	}
}
