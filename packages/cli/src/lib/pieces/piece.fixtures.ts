import {
	PieceSelectable,
	Pieces,
	PieceFrontmatter,
	LuzzleDatabase,
	PieceMarkdown,
	compile,
	PieceFrontmatterSchema,
} from '@luzzle/core'
import Piece from './piece.js'
import { mockDatabase } from '../database.mock.js'
import { Mocked } from 'vitest'

type PieceValidator = ReturnType<typeof compile<PieceFrontmatter>>

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
			title: { type: 'string' },
			keywords: { type: 'string', nullable: true },
			subtitle: { type: 'string', nullable: true },
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
	frontmatter?: F
): PieceMarkdown<F> {
	return {
		slug,
		note,
		frontmatter: frontmatter || makeFrontmatterSample(),
	} as PieceMarkdown<F>
}

export function makeSample(): PieceSelectable {
	return {
		...sample,
	} as PieceSelectable
}

class PieceOverridable extends Piece<Pieces, PieceSelectable, PieceFrontmatter> {
	constructor(
		overrides: {
			pieceRoot?: string
			table?: Pieces
			schema?: PieceFrontmatterSchema<{ title: string; keywords?: string; subtitle?: string }>
			db?: Mocked<LuzzleDatabase>
		} = {}
	) {
		const db = overrides.db || mockDatabase().db
		const root = overrides.pieceRoot || 'pieces-root'
		const table = overrides.table || ('table' as Pieces)
		const schema = overrides.schema || makeSchema()

		super(root, table, schema, db as unknown as LuzzleDatabase)
	}
}

export function makePiece() {
	return PieceOverridable
}
