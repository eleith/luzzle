import { Type } from '@sinclair/typebox';
import type { Static } from '@sinclair/typebox';

const fields = Type.Object({}, { additionalProperties: false });

export const schema = {
	name: 'lined-notebook-paper',
	description:
		'A lined notebook sheet on a dark backdrop, using the piece title, summary, note reading time and date.',
	fields
} as const;

export type Fields = Static<typeof fields>;
