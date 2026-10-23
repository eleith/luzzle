import { Type } from '@sinclair/typebox';
import type { Static } from '@sinclair/typebox';

const fields = Type.Object(
	{
		image: Type.Optional(Type.String({ description: 'Book cover image asset key.' })),
		author: Type.Optional(Type.String({ description: 'Author text displayed on the spine.' })),
		pages: Type.Optional(
			Type.Number({
				minimum: 0,
				default: 100,
				description: 'Page count used to calculate spine thickness.'
			})
		)
	},
	{ additionalProperties: false }
);

export const schema = {
	name: 'book',
	description: 'A three-dimensional book cover and spine with page-count thickness.',
	fields
} as const;

export type Fields = Static<typeof fields>;
