import { Type } from '@sinclair/typebox';
import type { Static } from '@sinclair/typebox';

const fields = Type.Object(
	{
		image: Type.Optional(Type.String({ description: 'Recipe image asset key.' })),
		ingredients: Type.Optional(
			Type.Array(
				Type.Object(
					{ item: Type.String({ description: 'Ingredient text displayed beside a checkbox.' }) },
					{ additionalProperties: false }
				)
			)
		)
	},
	{ additionalProperties: false }
);

export const schema = {
	name: 'recipe-card',
	description: 'A recipe card with an ingredient checklist and ring-binding cutouts.',
	fields
} as const;

export type Fields = Static<typeof fields>;
