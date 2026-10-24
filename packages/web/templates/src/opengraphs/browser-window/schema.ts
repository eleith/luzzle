import { Type } from '@sinclair/typebox';
import type { Static } from '@sinclair/typebox';

const fields = Type.Object(
	{
		image: Type.Optional(Type.String({ description: 'Webpage banner image asset key.' })),
		url: Type.Optional(Type.String({ description: 'URL displayed in the browser address bar.' })),
		author: Type.Optional(Type.String({ description: 'Author displayed below the title.' })),
		wordCount: Type.Optional(
			Type.Number({ minimum: 0, description: 'Word count used to estimate reading time.' })
		)
	},
	{ additionalProperties: false }
);

export const schema = {
	name: 'browser-window',
	description:
		'A browser-window mockup beside the title and author, with a hostname/reading-time/date byline.',
	fields
} as const;

export type Fields = Static<typeof fields>;
