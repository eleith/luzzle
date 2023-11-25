import { PieceCache } from './cache.js'
import Ajv, { JTDSchemaType } from 'ajv/dist/jtd.js'
import {
	PieceSelectable,
	PieceInsertable,
	PieceUpdatable,
	Pieces,
	PieceMarkdown,
} from '@luzzle/kysely'
import Piece from '../pieces/piece.js'

type PieceMarkdownSample = PieceMarkdown<
	Omit<
		PieceSelectable,
		'note' | 'slug' | 'date_updated' | 'date_added' | 'id' | 'author' | 'coauthors' | 'subtitle'
	>
>
type PieceValidator = Ajv.ValidateFunction<PieceMarkdownSample>
type PieceCacheSchema = JTDSchemaType<PieceCache<PieceSelectable>>
type PieceSchema = JTDSchemaType<PieceMarkdownSample>

const sample = {
	slug: 'sampleSlug',
	title: 'title',
	note: 'note',
}

export function makeValidator(): PieceValidator {
	const validate = () => true
	return validate as unknown as PieceValidator
}

export function makeCacheSchema(): PieceCacheSchema {
	return {} as PieceCacheSchema
}

export function makeSchema(
	propertyOverrides: Record<string, unknown> = {},
	optionalPropertyOverrides: Record<string, unknown> = {}
): PieceSchema {
	return {
		properties: {
			slug: { type: 'string' },
			frontmatter: {
				properties: {
					title: { type: 'string' },
					...propertyOverrides,
				},
				optionalProperties: {
					keywords: { type: 'string' },
					...optionalPropertyOverrides,
				},
			},
		},
		optionalProperties: {
			markdown: { type: 'string' },
		},
	} as PieceSchema
}

export function makeMarkdownSample(
	frontmatter: Record<string, unknown> = { title: sample.title }
): PieceMarkdownSample {
	return {
		slug: sample.slug,
		markdown: sample.note,
		frontmatter,
	} as PieceMarkdownSample
}

export function makeSample(): PieceSelectable {
	return {
		...sample,
	} as PieceSelectable
}

class PieceExample extends Piece<Pieces, PieceSelectable, PieceMarkdownSample> {
	constructor(
		pieceRoot = 'pieces-root',
		table: Pieces = 'table' as Pieces,
		schema: JTDSchemaType<PieceMarkdownSample> = makeSchema(),
		cacheSchema: PieceCacheSchema = makeCacheSchema()
	) {
		super(pieceRoot, table, schema, cacheSchema)
	}

	async toCreateInput(): Promise<PieceInsertable> {
		return {} as PieceInsertable
	}

	async toUpdateInput(): Promise<PieceUpdatable> {
		return {} as PieceUpdatable
	}

	async process(): Promise<void> {
		return
	}

	create(): PieceMarkdownSample {
		return {} as PieceMarkdownSample
	}

	async fetch(): Promise<PieceMarkdownSample> {
		return {} as PieceMarkdownSample
	}
}

export function makePiece() {
	return PieceExample
}
