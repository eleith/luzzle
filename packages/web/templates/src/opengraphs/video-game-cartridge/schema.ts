import { Type } from '@sinclair/typebox';
import type { Static } from '@sinclair/typebox';

const fields = Type.Object(
	{
		image: Type.Optional(
			Type.String({
				description:
					'Image asset key for the cartridge label; also the backdrop when no backdrop is mapped.'
			})
		),
		publisher: Type.Optional(Type.String({ description: 'Publisher displayed below the title.' })),
		platform: Type.Optional(Type.String({ description: 'Platform displayed in the byline.' })),
		playTimeMinutes: Type.Optional(
			Type.Number({
				minimum: 0,
				description: 'Play time in minutes, displayed as rounded whole hours.'
			})
		),
		backdrop: Type.Optional(Type.String({ description: 'Independent background image asset key.' }))
	},
	{ additionalProperties: false }
);

export const schema = {
	name: 'video-game-cartridge',
	description:
		'A video game cartridge beside its title and publisher, with a platform/play-time/date byline.',
	fields
} as const;

export type Fields = Static<typeof fields>;
