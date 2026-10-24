import { Type } from '@sinclair/typebox';
import type { Static } from '@sinclair/typebox';

const fields = Type.Object({}, { additionalProperties: false });

export const schema = {
	name: 'note',
	description: 'A text-first note page with a title, reading time, date and tags.',
	fields
} as const;

export type Fields = Static<typeof fields>;
