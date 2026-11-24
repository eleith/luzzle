import { createFileTemplateSelectionSchema } from '../config/association.js';
import type { TemplateConfig } from '../config/index.js';
import { schema as fallback } from './default/schema.js';
import { schema as article } from './article/schema.js';
import { schema as book } from './book/schema.js';
import { schema as film } from './film/schema.js';
import { schema as music } from './music/schema.js';
import { schema as note } from './note/schema.js';
import { schema as recipe } from './recipe/schema.js';
import { schema as snippet } from './snippet/schema.js';
import { schema as tabletopGame } from './tabletop-game/schema.js';
import { schema as videoGame } from './video-game/schema.js';

export const templates = [
	fallback,
	article,
	book,
	film,
	music,
	note,
	recipe,
	snippet,
	tabletopGame,
	videoGame
] as const;
export type PageDefinition = (typeof templates)[number];

export function getPageSchema(name = 'default'): PageDefinition {
	const template = templates.find((template) => template.name === name);
	if (!template) throw new Error(`Unknown page template: ${name}`);
	return template;
}

export function selectPageTemplate(config?: TemplateConfig['pieces'][number]): PageDefinition {
	return getPageSchema(config?.templates?.page?.name);
}

export function getPageTemplateNames(pieces: TemplateConfig['pieces']): Record<string, string> {
	const seen = new Set<string>();
	const names = new Map<string, string>();
	for (const piece of pieces) {
		// Match the first configured type used when hydrating a piece's fields.
		if (seen.has(piece.type)) continue;
		seen.add(piece.type);
		const page = piece.templates?.page;
		if (page && 'file' in page) continue;
		names.set(piece.type, selectPageTemplate(piece).name);
	}
	return Object.fromEntries(names);
}

export const schema = createFileTemplateSelectionSchema('page', templates);
