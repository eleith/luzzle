import { PieceCache } from './cache.js'
import Ajv, { JTDSchemaType } from 'ajv/dist/jtd.js'
import { PieceSelectable, Pieces, PieceFrontmatter } from '@luzzle/kysely'
import Piece from './piece.js'
import { PieceMarkdown } from './markdown.js'

type PieceFrontmatterSample = PieceFrontmatter<
	Omit<
		PieceSelectable,
		'note' | 'slug' | 'date_updated' | 'date_added' | 'id' | 'author' | 'coauthors' | 'subtitle'
	>
>
type PieceValidator = Ajv.ValidateFunction<PieceFrontmatterSample>
type PieceCacheSchema = JTDSchemaType<PieceCache<PieceSelectable>>
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

export function makeCacheSchema(): PieceCacheSchema {
	return {} as PieceCacheSchema
}

export function makeSchema(
	propertyOverrides: Record<string, unknown> = {},
	optionalPropertyOverrides: Record<string, unknown> = {}
): PieceSchema {
	return {
		properties: {
			title: { type: 'string' },
			...propertyOverrides,
		},
		optionalProperties: {
			keywords: { type: 'string' },
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

class PieceExample extends Piece<Pieces, PieceSelectable, PieceFrontmatterSample> {
	constructor(
		pieceRoot = 'pieces-root',
		table: Pieces = 'table' as Pieces,
		schema: JTDSchemaType<PieceFrontmatterSample> = makeSchema(),
		cacheSchema: PieceCacheSchema = makeCacheSchema()
	) {
		super(pieceRoot, table, schema, cacheSchema)
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
