import { vi } from 'vitest'
import {
	LuzzleSelectable,
	PieceFrontmatter,
	PieceMarkdown,
	compile,
	PieceFrontmatterSchema,
	LuzzleStorage,
} from '@luzzle/core'
import Piece from './piece.js'
import { PieceManagerSelect } from '@luzzle/core/dist/src/database/tables/pieces_manager.schema.js'

type PieceValidator = ReturnType<typeof compile<PieceFrontmatter>>

const sample = {
	note_markdown: 'sampleNote',
	file_path: 'samplePath',
	id: 'sampleId',
	type: 'sampleType',
	date_added: new Date().getTime(),
	date_updated: new Date().getTime(),
	frontmatter_json: JSON.stringify({ title: 'sampleTitle' }),
} as LuzzleSelectable<'pieces_items'>

export function makeValidator(): PieceValidator {
	const validate = () => true
	return validate as unknown as PieceValidator
}

export function makeSchema(
	name: string,
	properties?: {
		[key: string]: {
			type?: string
			nullable?: boolean
			items?: object
			format?: string
			pattern?: string
			enum?: string[] | number[]
		}
	}
): PieceFrontmatterSchema<{ title: string; keywords?: string; subtitle?: string }> {
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
	}
}

import { vi } from 'vitest'

export function makeStorage(root: string): LuzzleStorage {
	return {
		root,
		type: 'fs',
		parseArgPath: vi.fn(),
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
	frontmatter: Record<string, unknown> = { title: JSON.parse(sample.frontmatter_json).title }
): PieceFrontmatter {
	return frontmatter as PieceFrontmatter
}

export function makeMarkdownSample<F extends PieceFrontmatter>(
	initial = {} as Partial<PieceMarkdown<F>>
): PieceMarkdown<F> {
	return {
		note: sample.note_markdown,
		filePath: sample.file_path,
		piece: sample.type,
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

class PieceOverridable extends Piece<PieceFrontmatter> {
	constructor(
		name: string = 'table',
		storage: LuzzleStorage = makeStorage('root'),
		schema: PieceFrontmatterSchema<PieceFrontmatter> = makeSchema(name)
	) {
		super(name, storage, schema)
	}
}

export function makePieceMock() {
	return PieceOverridable
}

export function makeRegisteredPiece(overrides?: Partial<PieceManagerSelect>) {
	const { schema, ...rest } = overrides || {}
	return {
		id: `123lk12j3lj12k3${Math.random()}`,
		date_added: new Date().getTime(),
		date_updated: null,
		name: 'asdf',
		schema: makeSchema(schema || 'asdf'),
		...rest,
	}
}
