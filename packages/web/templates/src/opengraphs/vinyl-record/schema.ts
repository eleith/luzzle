import { Type } from '@sinclair/typebox';
import type { Static } from '@sinclair/typebox';

const fields = Type.Object(
	{
		image: Type.Optional(Type.String({ description: 'Vinyl label image asset key.' })),
		artist: Type.Optional(Type.String({ description: 'Artist displayed below the title.' })),
		durationSeconds: Type.Optional(
			Type.Number({
				minimum: 0,
				description: 'Duration in seconds, displayed as minutes and seconds.'
			})
		)
	},
	{ additionalProperties: false }
);

export const schema = {
	name: 'vinyl-record',
	description: 'A vinyl record beside its title and artist, with a duration/date byline.',
	fields
} as const;

export type Fields = Static<typeof fields>;
