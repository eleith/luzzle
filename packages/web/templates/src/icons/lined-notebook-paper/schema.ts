import { Type } from '@sinclair/typebox';
import type { Static } from '@sinclair/typebox';

const fields = Type.Object({}, { additionalProperties: false });

export const schema = {
	name: 'lined-notebook-paper',
	description: 'A ruled, three-hole sheet displaying the normalized piece title and summary.',
	fields
} as const;

export type Fields = Static<typeof fields>;
