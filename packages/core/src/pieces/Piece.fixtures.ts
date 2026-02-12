import { LuzzleSelectable } from '../database/tables/index.js'
import { PieceFrontmatter, PieceFrontmatterSchema } from './utils/frontmatter.js'
import { PieceMarkdown } from './utils/markdown.js'
import LuzzleStorage from '../storage/abstract.js'
import Piece from './Piece.js'
import { vi } from 'vitest'
import { PieceManagerSelect } from '../database/tables/pieces_manager.schema.js'

const sample = {
	note_markdown: 'sampleNote',
	file_path: 'samplePath.md',
	id: 'sampleId',
	type: 'table',
	date_added: new Date().getTime(),
	date_updated: new Date().getTime(),
	frontmatter_json: JSON.stringify({ title: 'sampleTitle' }),
} as LuzzleSelectable<'pieces_items'>

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
	propertiesOrName?: string | Record<string, MockSchemaProperty>
): PieceFrontmatterSchema<PieceFrontmatter> {
	const name = typeof propertiesOrName === 'string' ? propertiesOrName : 'table'
	const properties = typeof propertiesOrName === 'object' ? propertiesOrName : {}

	return {
		type: 'object',
		title: name,
		properties: {
			title: { type: 'string', examples: ['title'] },
			keywords: { type: 'string', nullable: true },
			subtitle: { type: 'string', nullable: true },
			...properties,
		},
		required: ['title'],
		additionalProperties: true,
	} as unknown as PieceFrontmatterSchema<PieceFrontmatter>
}

export function makeStorage(root = 'root'): LuzzleStorage {
	return {
		root,
		type: 'fs',
		parseArgPath: vi.fn((p) => p),
		readFile: vi.fn(),
		writeFile: vi.fn(),
		getFilesIn: vi.fn(),
		exists: vi.fn(),
		delete: vi.fn(),
		stat: vi.fn(),
		createReadStream: vi.fn(),
		createWriteStream: vi.fn(),
		makeDirectory: vi.fn(),
	} as unknown as LuzzleStorage
}

export function makeFrontmatterSample(
	overrides: Record<string, unknown> = {}
): PieceFrontmatter {
	return {
		title: 'sampleTitle',
		...overrides,
	}
}

export function makeMarkdownSample<F extends PieceFrontmatter>(
	initial = {} as Partial<PieceMarkdown<F>>
): PieceMarkdown<F> {
	return {
		note: 'sampleNote',
		filePath: 'samplePath.md',
		piece: 'table',
		frontmatter: makeFrontmatterSample() as F,
		...initial,
	}
}

export function makePieceItemSelectable(
	overrides?: Partial<LuzzleSelectable<'pieces_items'>>
): LuzzleSelectable<'pieces_items'> {
	return {
		...sample,
		...overrides,
	}
}

export class PieceMock extends Piece<PieceFrontmatter> {
	constructor(
		name: string = 'table',
		storage: LuzzleStorage = makeStorage(),
		schema: PieceFrontmatterSchema<PieceFrontmatter> = makeSchema(name)
	) {
		super(name, storage, schema)
	}
}

export function makePieceMock() {
	return PieceMock
}

export function makeRegisteredPiece(overrides?: Partial<PieceManagerSelect>) {
	const { schema, ...rest } = overrides || {}
	return {
		id: `id-${Math.random()}`,
		date_added: new Date().getTime(),
		date_updated: null,
		name: 'table',
		schema: makeSchema(typeof schema === 'string' ? schema : 'table'),
		...rest,
	}
}
