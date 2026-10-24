import { Type } from '@sinclair/typebox';
import type { Static } from '@sinclair/typebox';

const fields = Type.Object(
	{
		image: Type.Optional(Type.String({ description: 'Cover image asset key.' })),
		url: Type.Optional(Type.String({ description: 'External link.' })),
		isbn: Type.Optional(
			Type.String({ description: 'ISBN used for an Open Library link when no URL is supplied.' })
		),
		publisher: Type.Optional(Type.String({ description: 'Publisher name.' })),
		datePublished: Type.Optional(
			Type.Union([Type.String(), Type.Number()], {
				description: 'Publication date as text or epoch milliseconds.'
			})
		),
		playTimeMinutes: Type.Optional(
			Type.Number({ minimum: 0, description: 'Play time in minutes.' })
		),
		playerCount: Type.Optional(Type.Integer({ minimum: 1, description: 'Number of players.' }))
	},
	{ additionalProperties: false }
);

export const schema = {
	name: 'tabletop-game',
	description:
		'A tabletop-game page with a playing-card hero, minutes byline, player count, notes and cover.',
	fields
} as const;

export type Fields = Static<typeof fields>;
