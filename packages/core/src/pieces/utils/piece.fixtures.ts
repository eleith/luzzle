import Ajv, { JTDSchemaType, SomeJTDSchemaType } from 'ajv/dist/jtd.js'
import { PieceMarkdown } from './markdown.js'
import { PieceFrontmatter } from './frontmatter.js'
import { PieceSelectable } from '../tables.schema.js'

type PieceFrontmatterSample = PieceFrontmatter<PieceSelectable>
type PieceValidator = Ajv.ValidateFunction<PieceFrontmatterSample>
type PieceSchema = JTDSchemaType<PieceFrontmatterSample>
type PieceMarkdownSample = PieceMarkdown<PieceFrontmatterSample>

const sample = {
	slug: 'sampleSlug',
	title: 'title',
	note: 'note',
}

export function makeValidator(): PieceValidator {
	const validate = () => true
	return validate as unknown as PieceValidator
}

export function makeSchema(
	propertyOverrides: Record<string, SomeJTDSchemaType> = {},
	optionalPropertyOverrides: Record<string, SomeJTDSchemaType> = {}
): PieceSchema {
	return {
		properties: {
			title: { type: 'string' },
			...propertyOverrides,
		},
		optionalProperties: {
			keywords: { type: 'string' },
			subtitle: { type: 'string' },
			...optionalPropertyOverrides,
		},
	}
}

export function makeFrontmatterSample(
	frontmatter: Record<string, unknown> = { title: sample.title }
): PieceFrontmatterSample {
	return frontmatter as PieceFrontmatterSample
}

export function makeMarkdownSample(
	slug = sample.slug,
	note: string | null | undefined = sample.note,
	frontmatter: Record<string, unknown> = { title: sample.title }
): PieceMarkdownSample {
	return {
		slug,
		note,
		frontmatter,
	} as PieceMarkdownSample
}

export function makeSample(): PieceSelectable {
	return {
		...sample,
	} as PieceSelectable
}
