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
