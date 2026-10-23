import { Type } from '@sinclair/typebox';
import type { Static } from '@sinclair/typebox';

const fields = Type.Object(
	{
		image: Type.Optional(Type.String({ description: 'Article banner image asset key.' })),
		url: Type.Optional(
			Type.String({ description: 'Address-bar display text; defaults to the piece URL.' })
		)
	},
	{ additionalProperties: false }
);

export const schema = {
	name: 'browser-window',
	description: 'A browser window with address-bar text, an optional banner, title and summary.',
	fields
} as const;

export type Fields = Static<typeof fields>;
