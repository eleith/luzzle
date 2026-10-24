import { Type } from '@sinclair/typebox';
import type { Static } from '@sinclair/typebox';

const fields = Type.Object(
	{
		backdrop: Type.Optional(
			Type.String({ description: 'Background image asset key behind the playing cards.' })
		),
		publisher: Type.Optional(Type.String({ description: 'Publisher displayed below the title.' })),
		playTimeMinutes: Type.Optional(
			Type.Number({
				minimum: 0,
				description: 'Play time in minutes, displayed without conversion to hours.'
			})
		)
	},
	{ additionalProperties: false }
);

export const schema = {
	name: 'playing-cards',
	description:
		'Fanned playing cards using the title, summary and a deterministic symbol, with a publisher and play-time/date byline.',
	fields
} as const;

export type Fields = Static<typeof fields>;
