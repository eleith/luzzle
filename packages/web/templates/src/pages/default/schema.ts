import { Type } from '@sinclair/typebox';
import type { Static } from '@sinclair/typebox';

const fields = Type.Object(
	{
		subtitle: Type.Optional(Type.String({ description: 'Text displayed below the title.' })),
		image: Type.Optional(Type.String({ description: 'Representative image asset key.' })),
		details: Type.Optional(
			Type.Array(
				Type.Object(
					{
						label: Type.String(),
						value: Type.Union([Type.String(), Type.Number(), Type.Boolean()])
					},
					{ additionalProperties: false }
				),
				{
					description: 'Ordered detail rows containing label and value fields.'
				}
			)
		)
	},
	{ additionalProperties: false }
);

export const schema = {
	name: 'default',
	description: 'The default piece page with its title, note, tags and optional details.',
	fields
} as const;

export type Fields = Static<typeof fields>;
