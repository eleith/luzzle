import { Type } from '@sinclair/typebox';
import type { Static } from '@sinclair/typebox';
import {
	ConfigSchema,
	PieceConfigSchema,
	createPiecesSchema,
	loadConfig as loadBaseConfig
} from '@luzzle/web.config';
import { templateSchema } from './schema.js';
import { validateTemplateSelectors } from './selectors.js';

export const configSchema = Type.Object(
	{
		...ConfigSchema.properties,
		pieces: createPiecesSchema(
			Type.Object(
				{
					...PieceConfigSchema.properties,
					templates: Type.Optional(templateSchema)
				},
				{ additionalProperties: false }
			)
		)
	},
	{
		title: ConfigSchema.title,
		additionalProperties: false
	}
);

export type TemplateConfig = Static<typeof configSchema>;

export function loadConfig(filename?: string): TemplateConfig {
	const config = loadBaseConfig(filename, { schema: configSchema });
	validateTemplateSelectors(config);
	return config;
}
