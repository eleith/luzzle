import Ajv, { JTDSchemaType, SomeJTDSchemaType } from 'ajv/dist/jtd.js'
import {
	PieceSelectable,
	Pieces,
	PieceFrontmatter,
	LuzzleDatabase,
	PieceMarkdown,
} from '@luzzle/kysely'
import Piece from './piece.js'
import { mockDatabase } from '../database.mock.js'

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

class PieceOverridable extends Piece<Pieces, PieceSelectable, PieceFrontmatterSample> {
	constructor(
		overrides: {
			pieceRoot?: string
			table?: Pieces
			schema?: JTDSchemaType<PieceFrontmatterSample>
			db?: LuzzleDatabase
		} = {}
	) {
		const options = {
			pieceRoot: 'pieces-root',
			table: 'table' as Pieces,
			schema: makeSchema(),
			db: mockDatabase().db,
			...overrides,
		}
		super(options.pieceRoot, options.table, options.schema, options.db)
	}
}

export function makePiece() {
	return PieceOverridable
}
