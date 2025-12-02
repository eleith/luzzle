import { LuzzleDatabase, Piece, PieceFrontmatter, PieceMarkdown } from '@luzzle/core'
import { merge, omit } from 'lodash-es'
import { Command, Context } from '../index.js'
import { Config } from '../../../lib/config.js'
import log from '../../log.js'
import { Pieces, PieceFrontmatterSchema, LuzzleStorage } from '@luzzle/core'
import { vi } from 'vitest'

function makeSchema(
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

function makeStorage(root: string): LuzzleStorage {
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
function makeContext(
	overrides?: Partial<Pick<Context, 'db' | 'storage'>> &
		DeepPartial<Omit<Context, 'db' | 'log' | 'storage'>>
): Context {
	const storage = overrides?.storage || makeStorage('root')
	return {
		db: overrides?.db || ({} as LuzzleDatabase),
		...merge(
			{
				log,
				storage,
				pieces: new Pieces(storage),
				config: { set: () => { }, delete: () => { }, get: () => { } } as unknown as Config,
				flags: {
					dryRun: false,
				},
			},
			omit(overrides, 'db')
		),
	}
}

function makeCommand<T>(name: string, run: () => Promise<void> = async () => { }) {
	const command: Command<T> = {
		name,
		command: `${name} [flags]`,
		describe: `a test command`,
		run,
	}

	return command
}

function makePieceMock() {
	const name = 'table'
	const storage: LuzzleStorage = makeStorage('root')
	const schema: PieceFrontmatterSchema<PieceFrontmatter> = makeSchema(name)

	return new Piece(name, storage, schema)
}

function makeMarkdownSample<F extends PieceFrontmatter>(
	initial = {} as Partial<PieceMarkdown<F>>
): PieceMarkdown<F> {
	return {
		note: 'note',
		filePath: 'path/to/file.md',
		piece: 'books',
		frontmatter: {} as F,
		...initial,
	}
}

export { makeContext, makeCommand, makePieceMock, makeSchema, makeStorage, makeMarkdownSample }
