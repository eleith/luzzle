import { Type } from '@sinclair/typebox';
import type { Static } from '@sinclair/typebox';

const fields = Type.Object(
	{
		image: Type.Optional(Type.String({ description: 'Cartridge label image asset key.' }))
	},
	{ additionalProperties: false }
);

export const schema = {
	name: 'video-game-cartridge',
	description: 'A video-game cartridge with a title and optional label image.',
	fields
} as const;

export type Fields = Static<typeof fields>;
