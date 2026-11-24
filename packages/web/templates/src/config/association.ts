import { Type } from '@sinclair/typebox';
import type { TObject } from '@sinclair/typebox';
import { createFieldMappingSchema } from '@luzzle/web.config/mapping';

export type TemplateRole = 'icon' | 'page' | 'opengraph';

export interface TemplateDefinition {
	readonly name: string;
	readonly description: string;
	readonly fields: TObject;
}

function createTemplateMappingSchema(role: TemplateRole, template: TemplateDefinition) {
	const fields = Object.fromEntries(
		Object.entries(template.fields.properties).map(([field, schema]) => [
			field,
			Type.Optional(
				createFieldMappingSchema(`${role}-${template.name}-${field}`, schema.description)
			)
		])
	);
	return Type.Object(fields, { additionalProperties: false });
}

/** Compose named template contracts without importing their implementations. */
export function createTemplateSelectionSchema(
	role: TemplateRole,
	templates: readonly TemplateDefinition[]
) {
	if (!templates.some((template) => template.name === 'default')) {
		throw new Error(`The ${role} template catalog must include "default".`);
	}
	return Type.Union(
		templates.map((template) => {
			const nameOptions = template.name === 'default' ? { default: 'default' } : {};
			const mapping = createTemplateMappingSchema(role, template);
			return Type.Object(
				{
					name: Type.Literal(template.name, nameOptions),
					mapping: Type.Optional(mapping)
				},
				{ additionalProperties: false, description: template.description }
			);
		}),
		{ default: { name: 'default' } }
	);
}

/** A local Svelte file may declare fields beyond its built-in fallback. */
export function createFileTemplateSelectionSchema<Name extends string>(
	role: TemplateRole,
	templates: readonly (TemplateDefinition & { name: Name })[]
) {
	const builtIn = createTemplateSelectionSchema(role, templates);
	const external = Type.Object(
		{
			file: Type.String({
				pattern: '^(?!/)(?![A-Za-z][A-Za-z0-9+.-]*:)[^\\\\\\x00\\r\\n]+\\.svelte$',
				description:
					'Trusted local Svelte file, relative to the working directory of each service that renders it (/app in production Docker), not the mounted config directory.'
			}),
			name: Type.Optional(Type.Union(templates.map(({ name }) => Type.Literal(name)))),
			mapping: Type.Optional(
				Type.Record(Type.String(), createFieldMappingSchema(`${role}-external-field`))
			)
		},
		{ additionalProperties: false }
	);
	return Type.Union([...builtIn.anyOf, external], { default: builtIn.default });
}
