import { Type } from '@sinclair/typebox';
import type { Static } from '@sinclair/typebox';

const fields = Type.Object({}, { additionalProperties: false });

export const schema = {
	name: 'playing-cards',
	description: 'A fan of playing cards using the piece title, normalized tags and palette.',
	fields
} as const;

export type Fields = Static<typeof fields>;
