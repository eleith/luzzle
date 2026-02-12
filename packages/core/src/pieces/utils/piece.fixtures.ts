import { JSONSchemaType, ValidateFunction } from 'ajv'
import { PieceMarkdown } from './markdown.js'
import { PieceFrontmatter } from './frontmatter.js'
import { PiecesItemsSelectable } from '../../database/tables/pieces_items.schema.js'
import { vi } from 'vitest'
import LuzzleStorage from '../../storage/abstract.js'

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

export type MockSchemaProperty = {
	type?: string
	nullable?: boolean
	items?: MockSchemaProperty
	format?: string
	pattern?: string
	enum?: string[] | number[]
	properties?: Record<string, MockSchemaProperty>
	required?: string[]
	examples?: unknown[]
	default?: unknown
}

export function makeSchema(
	propertiesOrTitle?: string | Record<string, MockSchemaProperty>
): JSONSchemaType<PieceFrontmatter> {
	const title = typeof propertiesOrTitle === 'string' ? propertiesOrTitle : 'Piece'
	const properties = typeof propertiesOrTitle === 'object' ? propertiesOrTitle : {}

	return {
		type: 'object',
		title,
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
	filePathOrOptions: string | { note?: string; frontmatter: F } = sample.file_path,
	piece = sample.type,
	note?: string,
	frontmatter?: F
): PieceMarkdown<F> {
	if (typeof filePathOrOptions === 'object') {
		return {
			filePath: sample.file_path,
			piece: sample.type,
			note: filePathOrOptions.note || sample.note_markdown,
			frontmatter: filePathOrOptions.frontmatter,
		}
	}

	return {
		filePath: filePathOrOptions,
		piece,
		note: note || sample.note_markdown,
		frontmatter: frontmatter as F,
	}
}

export function makeSample(): PiecesItemsSelectable {
	return sample
}

export function makePieceMock() {
	return class PieceMock {
		constructor(
			public type = 'books',
			public storage = {} as LuzzleStorage,
			public schema = makeSchema()
		) {}
	}
}

export function makeFrontmatterSample(): PieceFrontmatter {
	return { title: 'sample' }
}

export function makePieceItemSelectable(data?: Partial<PiecesItemsSelectable>): PiecesItemsSelectable {
	return { ...sample, ...data }
}

export function makeStorage(root: string): LuzzleStorage {
	return {
		type: 'fs',
		root,
		parseArgPath: vi.fn(),
		exists: vi.fn(),
		delete: vi.fn(),
		readFile: vi.fn(),
		writeFile: vi.fn(),
		stat: vi.fn(),
		createReadStream: vi.fn(),
		createWriteStream: vi.fn(),
		makeDirectory: vi.fn(),
		getFilesIn: vi.fn(),
	} as unknown as LuzzleStorage
}
