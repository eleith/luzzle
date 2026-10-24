import { Type } from '@sinclair/typebox';
import type { Static } from '@sinclair/typebox';

const fields = Type.Object(
	{
		image: Type.Optional(Type.String({ description: 'Poster image asset key.' })),
		backdrop: Type.Optional(Type.String({ description: 'Backdrop image asset key.' })),
		dateReleased: Type.Optional(
			Type.Union([Type.String(), Type.Number()], {
				description: 'Release date as text or epoch milliseconds.'
			})
		),
		runtime: Type.Optional(Type.Number({ description: 'Duration in minutes.' })),
		url: Type.Optional(Type.String({ description: 'External link.' })),
		isbn: Type.Optional(
			Type.String({ description: 'ISBN used for an Open Library link when no URL is supplied.' })
		),
		category: Type.Optional(
			Type.String({ description: 'Display category, independent of the archive piece type.' })
		),
		people: Type.Optional(
			Type.Array(
				Type.Union([
					Type.String(),
					Type.Object({ name: Type.String() }, { additionalProperties: false })
				]),
				{ description: 'People as names or mapped objects with a name field.' }
			)
		)
	},
	{ additionalProperties: false }
);

export const schema = {
	name: 'film',
	description:
		'A film page with poster, year/runtime byline, notes, people and backdrop, independent of the default page.',
	fields
} as const;

export type Fields = Static<typeof fields>;
