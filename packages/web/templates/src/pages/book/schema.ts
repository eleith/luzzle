import { Type } from '@sinclair/typebox';
import type { Static } from '@sinclair/typebox';

const fields = Type.Object(
	{
		image: Type.Optional(Type.String({ description: 'Cover image asset key.' })),
		author: Type.Optional(
			Type.String({ description: 'Author text displayed in the byline and cover spine.' })
		),
		pages: Type.Optional(
			Type.Number({ minimum: 0, description: 'Page count displayed in the byline.' })
		),
		publicationYear: Type.Optional(
			Type.Integer({ description: 'Year displayed under Published.' })
		),
		url: Type.Optional(Type.String({ description: 'External link.' })),
		isbn: Type.Optional(
			Type.String({ description: 'ISBN used for an Open Library link when no URL is supplied.' })
		)
	},
	{ additionalProperties: false }
);

export const schema = {
	name: 'book',
	description: 'A book page with author/page-count byline, notes, publication details and cover.',
	fields
} as const;

export type Fields = Static<typeof fields>;
