import { Type } from '@sinclair/typebox';
import type { Static } from '@sinclair/typebox';

const fields = Type.Object(
	{
		files: Type.Optional(
			Type.Array(
				Type.Object(
					{
						file: Type.String({
							description: 'Asset key whose generated highlight content is displayed.'
						}),
						type: Type.Optional(Type.String({ default: 'snippet' }))
					},
					{ additionalProperties: false }
				)
			)
		)
	},
	{ additionalProperties: false }
);

export const schema = {
	name: 'code-snippet',
	description: 'A dark terminal showing the first snippet asset highlight, or the piece summary.',
	fields
} as const;

export type Fields = Static<typeof fields>;
