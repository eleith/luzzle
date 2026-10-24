import { Type } from '@sinclair/typebox';
import type { Static } from '@sinclair/typebox';

const fields = Type.Object(
	{
		image: Type.Optional(
			Type.String({ description: 'Cover art and vinyl label image asset key.' })
		),
		artist: Type.Optional(Type.String({ description: 'Artist displayed in the byline.' })),
		durationSeconds: Type.Optional(
			Type.Number({ minimum: 0, description: 'Track duration in seconds.' })
		),
		album: Type.Optional(Type.String()),
		dateReleased: Type.Optional(
			Type.Union([Type.String(), Type.Number()], {
				description: 'Release date as text or epoch milliseconds.'
			})
		),
		language: Type.Optional(Type.String()),
		collaborators: Type.Optional(
			Type.Array(
				Type.Union([
					Type.String(),
					Type.Object({ name: Type.String() }, { additionalProperties: false })
				])
			)
		),
		url: Type.Optional(Type.String({ description: 'External source URL.' })),
		youtubeId: Type.Optional(Type.String()),
		spotifyId: Type.Optional(Type.String()),
		appleMusicUrl: Type.Optional(Type.String({ description: 'Apple Music URL.' })),
		isrc: Type.Optional(
			Type.String({ description: 'ISRC identifier (map legacy iscr metadata here).' })
		)
	},
	{ additionalProperties: false }
);

export const schema = {
	name: 'music',
	description: 'A music page with vinyl artwork, track details, notes and service links.',
	fields
} as const;

export type Fields = Static<typeof fields>;
