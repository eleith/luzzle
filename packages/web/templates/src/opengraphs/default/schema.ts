import { Type } from '@sinclair/typebox';
import type { Static } from '@sinclair/typebox';

const fields = Type.Object(
	{
		image: Type.Optional(Type.String({ description: 'Representative image asset key.' }))
	},
	{ additionalProperties: false }
);

export const schema = {
	name: 'default',
	description: 'The default share card using the piece title and summary.',
	fields
} as const;

export type Fields = Static<typeof fields>;
