import { JSONSchemaType, ValidateFunction } from 'ajv'
import { PieceMarkdown } from './markdown.js'
import { PieceFrontmatter } from './frontmatter.js'
import { PiecesItemsSelectable } from '../../database/tables/pieces_items.schema.js'

type PieceValidator = ValidateFunction<PieceFrontmatter>

const sample: PiecesItemsSelectable = {
	id: '1',
	file_path: 'samplePath',
	note_markdown: 'note',
	type: 'books',
	date_added: new Date().getTime(),
	date_updated: new Date().getTime(),
	frontmatter_json: JSON.stringify({ title: 'title' }),
	assets_json_array: JSON.stringify([]),
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
}): JSONSchemaType<PieceFrontmatter> {
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
	} as unknown as JSONSchemaType<PieceFrontmatter>
}

export function makeMarkdownSample<F extends PieceFrontmatter>(
	filePath = sample.file_path,
	piece = sample.type,
	note: string | undefined = sample.note_markdown,
	frontmatter: F
): PieceMarkdown<F> {
	return {
		filePath,
		piece,
		note,
		frontmatter,
	}
}

export function makeSample(): PiecesItemsSelectable {
	return sample
}
