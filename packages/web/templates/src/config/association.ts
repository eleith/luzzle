import { Type } from '@sinclair/typebox';
import type { TObject } from '@sinclair/typebox';
import { createFieldMappingSchema } from '@luzzle/web.config/mapping';

type TemplateRole = 'icon' | 'page' | 'opengraph';

interface TemplateDefinition {
	readonly description: string;
	readonly fields: TObject;
}

function createTemplateMappingSchema(role: TemplateRole, template: TemplateDefinition) {
	const fields = Object.fromEntries(
		Object.entries(template.fields.properties).map(([field, schema]) => [
			field,
			Type.Optional(createFieldMappingSchema(`${role}-default-${field}`, schema.description))
		])
	);
	return Type.Object(fields, { additionalProperties: false });
}

/** A local Svelte file may declare fields beyond its generic fallback. */
export function createRoleSchema(role: TemplateRole, template: TemplateDefinition) {
	const name = Type.Literal('default', { default: 'default' });
	const builtIn = Type.Object(
		{ name, mapping: Type.Optional(createTemplateMappingSchema(role, template)) },
		{ additionalProperties: false, description: template.description }
	);
	const external = Type.Object(
		{
			file: Type.String({
				pattern: '^(?!/)(?![A-Za-z][A-Za-z0-9+.-]*:)[^\\\\\\x00\\r\\n]+\\.svelte$',
				description:
					'Trusted local Svelte file, relative to the working directory of each service that renders it (/app in production Docker), not the mounted config directory.'
			}),
			name: Type.Optional(name),
			mapping: Type.Optional(
				Type.Record(Type.String(), createFieldMappingSchema(`${role}-external-field`))
			)
		},
		{ additionalProperties: false }
	);
	return Type.Union([builtIn, external], { default: { name: 'default' } });
}
