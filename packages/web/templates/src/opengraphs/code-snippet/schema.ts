import { Type } from '@sinclair/typebox';
import type { Static } from '@sinclair/typebox';

const fields = Type.Object(
	{
		files: Type.Optional(
			Type.Array(
				Type.Object(
					{
						file: Type.String({ description: 'Asset key of the source file.' }),
						type: Type.Optional(
							Type.String({
								default: 'snippet',
								description: 'File type; the first snippet supplies generated highlighting.'
							})
						),
						format: Type.Optional(
							Type.String({ description: 'Format label displayed in the byline.' })
						)
					},
					{ additionalProperties: false }
				),
				{ description: 'Source files in display order.' }
			)
		)
	},
	{ additionalProperties: false }
);

export const schema = {
	name: 'code-snippet',
	description:
		'A dark terminal displaying generated code highlighting or a summary, with a formats/file-count/date byline.',
	fields
} as const;

export type Fields = Static<typeof fields>;
