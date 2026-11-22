import { Type } from '@sinclair/typebox';
import { createFieldMappingSchema } from '@luzzle/web.config/mapping';
import { createTemplateSelectionSchema } from '../config/association.js';
import type { TemplateConfig } from '../config/index.js';
import { schema as fallback } from './default/schema.js';
import { schema as book } from './book/schema.js';
import { schema as browserWindow } from './browser-window/schema.js';
import { schema as codeSnippet } from './code-snippet/schema.js';
import { schema as linedNotebookPaper } from './lined-notebook-paper/schema.js';
import { schema as playingCards } from './playing-cards/schema.js';
import { schema as poster } from './poster/schema.js';
import { schema as recipeCard } from './recipe-card/schema.js';
import { schema as videoGameCartridge } from './video-game-cartridge/schema.js';
import { schema as vinylRecord } from './vinyl-record/schema.js';

export const templates = [
	fallback,
	book,
	browserWindow,
	codeSnippet,
	linedNotebookPaper,
	playingCards,
	poster,
	recipeCard,
	videoGameCartridge,
	vinylRecord
] as const;
export type IconDefinition = (typeof templates)[number];

export function getIconSchema(name = 'default'): IconDefinition {
	const template = templates.find((template) => template.name === name);
	if (!template) throw new Error(`Unknown icon template: ${name}`);
	return template;
}

export function selectIconTemplate(config?: TemplateConfig['pieces'][number]): IconDefinition {
	return getIconSchema(config?.templates?.icon?.name);
}

export function getIconTemplateNames(pieces: TemplateConfig['pieces']): Record<string, string> {
	const names = new Map<string, string>();
	for (const piece of pieces) {
		// Match the first configured type used when hydrating a piece's fields.
		if (!names.has(piece.type)) names.set(piece.type, selectIconTemplate(piece).name);
	}
	return Object.fromEntries(names);
}

const builtIn = createTemplateSelectionSchema('icon', templates);
const external = Type.Object(
	{
		file: Type.String({
			pattern: '^(?!/)(?![A-Za-z][A-Za-z0-9+.-]*:)[^\\\\\\x00\\r\\n]+\\.svelte$',
			description:
				'Trusted local Svelte file, relative to the web process working directory (/app in production Docker), not the mounted config directory.'
		}),
		name: Type.Optional(Type.Union(templates.map(({ name }) => Type.Literal(name)))),
		mapping: Type.Optional(
			Type.Record(Type.String(), createFieldMappingSchema('icon-external-field'))
		)
	},
	{ additionalProperties: false }
);
export const schema = Type.Union([...builtIn.anyOf, external], { default: builtIn.default });
