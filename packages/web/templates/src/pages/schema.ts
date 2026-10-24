import { createTemplateSelectionSchema } from '../config/association.js';
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

export const schema = createTemplateSelectionSchema('page', templates);
