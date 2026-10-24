import { Type } from '@sinclair/typebox';
import type { Static } from '@sinclair/typebox';

const fields = Type.Object(
	{
		image: Type.Optional(Type.String({ description: 'Recipe backdrop image asset key.' })),
		source: Type.Optional(Type.String({ description: 'Source label displayed under the title.' })),
		ingredients: Type.Optional(
			Type.Array(Type.Object({ item: Type.String() }, { additionalProperties: false }), {
				description: 'Ordered ingredient names displayed on the checklist.'
			})
		),
		prepMinutes: Type.Optional(Type.Number({ minimum: 0 })),
		cookMinutes: Type.Optional(Type.Number({ minimum: 0 })),
		totalMinutes: Type.Optional(Type.Number({ minimum: 0 }))
	},
	{ additionalProperties: false }
);

export const schema = {
	name: 'recipe-card',
	description:
		'An ingredient checklist and optional photo backdrop beside the recipe title/source.',
	fields
} as const;
export type Fields = Static<typeof fields>;
