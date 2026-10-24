import { Type } from '@sinclair/typebox';
import type { Static } from '@sinclair/typebox';

const fields = Type.Object(
	{
		image: Type.Optional(Type.String({ description: 'Recipe photo asset key.' })),
		url: Type.Optional(Type.String({ description: 'External recipe source link.' })),
		ingredients: Type.Optional(
			Type.Array(
				Type.Object(
					{
						item: Type.String(),
						quantity: Type.Optional(Type.Union([Type.Number(), Type.String()])),
						unit: Type.Optional(Type.String()),
						note: Type.Optional(Type.String())
					},
					{ additionalProperties: false }
				),
				{ description: 'Ordered ingredient checklist.' }
			)
		),
		instructions: Type.Optional(
			Type.Array(
				Type.Union([
					Type.String({ description: 'Published instruction HTML from trusted archive content.' }),
					Type.Object({ text: Type.String() }, { additionalProperties: false }),
					Type.Object(
						{
							html: Type.String({
								description: 'Published HTML, with the same trust boundary as note content.'
							})
						},
						{ additionalProperties: false }
					)
				]),
				{
					description:
						'Ordered steps: authored HTML strings, explicit HTML objects, or escaped text objects.'
				}
			)
		),
		prepMinutes: Type.Optional(Type.Number({ minimum: 0 })),
		cookMinutes: Type.Optional(Type.Number({ minimum: 0 })),
		totalMinutes: Type.Optional(Type.Number({ minimum: 0 })),
		dateUpdated: Type.Optional(
			Type.Union([Type.String(), Type.Number()], {
				description: 'Update date as text or epoch milliseconds.'
			})
		)
	},
	{ additionalProperties: false }
);

export const schema = {
	name: 'recipe',
	description: 'A recipe page with notes, ingredient checkboxes, instructions, timings and photo.',
	fields
} as const;
export type Fields = Static<typeof fields>;
