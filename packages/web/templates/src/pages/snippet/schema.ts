import { Type } from '@sinclair/typebox';
import type { Static } from '@sinclair/typebox';

const fields = Type.Object(
	{
		files: Type.Optional(
			Type.Array(
				Type.Object(
					{
						file: Type.String({
							description: 'Asset key used for generated highlights and attachments.'
						}),
						name: Type.Optional(
							Type.String({ description: 'Display filename; falls back to the asset key.' })
						),
						format: Type.Optional(Type.String({ description: 'Display language or format.' })),
						type: Type.Optional(
							Type.String({
								default: 'snippet',
								description:
									'snippet displays generated highlights; other types display an attachment header.'
							})
						)
					},
					{ additionalProperties: false }
				),
				{ description: 'Ordered files, supporting structured each/fields mappings.' }
			)
		),
		dateUpdated: Type.Optional(
			Type.Union([Type.String(), Type.Number()], {
				description: 'Last updated date as text or epoch milliseconds.'
			})
		)
	},
	{ additionalProperties: false }
);

export const schema = {
	name: 'snippet',
	description: 'A code snippet page with generated syntax highlighting and attachment downloads.',
	fields
} as const;

export type Fields = Static<typeof fields>;
