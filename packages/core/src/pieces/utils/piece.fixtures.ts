import Ajv from 'ajv'
import { PieceMarkdown } from './markdown.js'
import { PieceFrontmatter, PieceFrontmatterSchema } from './frontmatter.js'
import { PiecesItemsSelectable } from '../tables.schema.js'

type PieceValidator = Ajv.ValidateFunction<PieceFrontmatter>

const sample = {
	slug: 'sampleSlug',
	title: 'title',
	note: 'note',
}

export function makeValidator(): PieceValidator {
	const validate = () => true
	return validate as unknown as PieceValidator
}

export function makeSchema(properties?: {
	[key: string]: {
		type?: string
		nullable?: boolean
		items?: object
		format?: string
		pattern?: string
		enum?: string[] | number[]
	}
}): PieceFrontmatterSchema<{ title: string; keywords?: string; subtitle?: string }> {
	return {
		type: 'object',
		properties: {
			title: { type: 'string', examples: ['title'] },
			keywords: { type: 'string', examples: ['keyword1'], nullable: true },
			subtitle: { type: 'string', examples: ['subtitle'], nullable: true },
			...properties,
		},
		required: ['title'],
		additionalProperties: true,
	}
}

export function makeFrontmatterSample(
	frontmatter: Record<string, unknown> = { title: sample.title }
): PieceFrontmatter {
	return frontmatter as PieceFrontmatter
}

export function makeMarkdownSample<F extends PieceFrontmatter>(
	slug = sample.slug,
	note: string | null | undefined = sample.note,
	frontmatter: F
): PieceMarkdown<F> {
	return {
		slug,
		note,
		frontmatter,
	} as PieceMarkdown<F>
}

export function makeSample(): PiecesItemsSelectable {
	return {
		...sample,
	} as PiecesItemsSelectable
}
