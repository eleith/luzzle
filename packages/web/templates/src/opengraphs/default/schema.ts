import { Type } from '@sinclair/typebox';
import type { Static } from '@sinclair/typebox';

const fields = Type.Object(
	{
		image: Type.Optional(Type.String({ description: 'Poster image asset key.' })),
		backdrop: Type.Optional(Type.String({ description: 'Backdrop image asset key.' })),
		director: Type.Optional(Type.String({ description: 'Director text displayed in the byline.' })),
		dateReleased: Type.Optional(
			Type.Union([Type.String(), Type.Number()], {
				description: 'Release date as text or epoch milliseconds.'
			})
		),
		runtime: Type.Optional(Type.Number({ description: 'Duration in minutes.' }))
	},
	{ additionalProperties: false }
);

export const schema = {
	name: 'default',
	description: 'An independent poster-style default share card.',
	fields
} as const;

export type Fields = Static<typeof fields>;
