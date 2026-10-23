import { Type } from '@sinclair/typebox';
import type { Static } from '@sinclair/typebox';

const fields = Type.Object(
	{
		image: Type.Optional(Type.String({ description: 'Record label image asset key.' }))
	},
	{ additionalProperties: false }
);

export const schema = {
	name: 'vinyl-record',
	description: 'A grooved vinyl record with label artwork or a title fallback.',
	fields
} as const;

export type Fields = Static<typeof fields>;
