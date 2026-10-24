import { Type } from '@sinclair/typebox';
import type { Static } from '@sinclair/typebox';

const fields = Type.Object(
	{
		image: Type.Optional(Type.String({ description: 'Article banner image asset key.' })),
		url: Type.Optional(
			Type.String({ description: 'External article link and browser address text.' })
		),
		author: Type.Optional(Type.String({ description: 'Author text displayed in the byline.' })),
		wordCount: Type.Optional(
			Type.Number({ minimum: 0, description: 'Word count used to estimate reading time.' })
		),
		datePublished: Type.Optional(
			Type.Union([Type.String(), Type.Number()], {
				description: 'Publication date as text or epoch milliseconds.'
			})
		),
		isActive: Type.Optional(
			Type.Boolean({ default: true, description: 'Whether the article link is still active.' })
		),
		isPaywalled: Type.Optional(
			Type.Boolean({ default: false, description: 'Whether the article requires a subscription.' })
		)
	},
	{ additionalProperties: false }
);

export const schema = {
	name: 'article',
	description:
		'An article page with a browser preview, reading-time byline, notes and publication details.',
	fields
} as const;

export type Fields = Static<typeof fields>;
