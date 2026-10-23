import { Type } from '@sinclair/typebox';
import type { Static } from '@sinclair/typebox';

const fields = Type.Object(
	{
		image: Type.Optional(Type.String({ description: 'Image asset key displayed as the poster.' }))
	},
	{ additionalProperties: false }
);

export const schema = {
	name: 'default',
	description: 'The default piece icon: a poster image with a title fallback.',
	fields
} as const;

export type Fields = Static<typeof fields>;
