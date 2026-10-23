import { Type } from '@sinclair/typebox';
import type { Static } from '@sinclair/typebox';
import { ConfigSchema, loadConfig as loadBaseConfig } from '@luzzle/web.config';
import { templateSchema } from './schema.js';

const pieces = ConfigSchema.properties.pieces;

export const configSchema = Type.Object(
	{
		...ConfigSchema.properties,
		pieces: Type.Array(
			Type.Object(
				{
					...pieces.items.properties,
					templates: Type.Optional(templateSchema)
				},
				{ additionalProperties: false }
			),
			{
				default: pieces.default,
				description: pieces.description
			}
		)
	},
	{
		title: ConfigSchema.title,
		additionalProperties: false
	}
);

export type TemplateConfig = Static<typeof configSchema>;

export function loadConfig(filename?: string): TemplateConfig {
	return loadBaseConfig(filename, { schema: configSchema });
}
