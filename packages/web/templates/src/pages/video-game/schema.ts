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
		platform: Type.Optional(Type.String({ description: 'Platform displayed in the byline.' }))
	},
	{ additionalProperties: false }
);

export const schema = {
	name: 'video-game',
	description:
		'A video-game page with a cartridge hero, platform and hours byline, notes and cover.',
	fields
} as const;

export type Fields = Static<typeof fields>;
