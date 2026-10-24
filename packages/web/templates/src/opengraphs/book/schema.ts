import { Type } from '@sinclair/typebox';
import type { Static } from '@sinclair/typebox';

const fields = Type.Object(
	{
		image: Type.Optional(Type.String({ description: 'Book cover image asset key.' })),
		author: Type.Optional(Type.String({ description: 'Author displayed below the title.' })),
		pages: Type.Optional(
			Type.Number({ minimum: 0, description: 'Page count displayed in the byline.' })
		)
	},
	{ additionalProperties: false }
);

export const schema = {
	name: 'book',
	description: 'A book cover and pages beside its title and author, with a page-count/date byline.',
	fields
} as const;

export type Fields = Static<typeof fields>;
