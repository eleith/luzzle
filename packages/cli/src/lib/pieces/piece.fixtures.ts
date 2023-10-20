import { PieceCache } from './cache.js'
import { PieceMarkDown } from './markdown.js'
import Ajv, { JTDSchemaType } from 'ajv/dist/jtd.js'
import { PieceSelectable, PieceInsertable, PieceUpdatable, PieceTables } from '@luzzle/kysely'
import Piece from '../pieces/piece.js'
import CacheForType from '../cache.js'

type PieceMarkdownSample = PieceMarkDown<PieceSelectable, 'cover_path'>
type PieceValidator = Ajv.ValidateFunction<PieceMarkdownSample>
type PieceCacheSchema = JTDSchemaType<PieceCache<PieceSelectable>>

const sample = {
	slug: 'sampleSlug',
	title: 'title',
	note: 'note',
}

export function makeValidator(): PieceValidator {
	const validate = () => true
	validate.schema = {
		markdown: 'string',
		slug: 'string',
		frontmatter: {
			title: 'string',
		},
	}
	return validate as unknown as PieceValidator
}

export function makeCacheSchema(): PieceCacheSchema {
	return {} as PieceCacheSchema
}

export function makeCache(
	obj: Partial<Record<keyof CacheForType<PieceCache<PieceSelectable>>, unknown>> = {} as Partial<
		Record<keyof CacheForType<PieceCache<PieceSelectable>>, unknown>
	>
): CacheForType<PieceCache<PieceSelectable>> {
	return obj as unknown as CacheForType<PieceCache<PieceSelectable>>
}

export function makeMarkdownSample(
	frontmatter = { title: sample.title } as Partial<PieceMarkdownSample['frontmatter']>
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

class PieceExample extends Piece<
	PieceTables,
	PieceSelectable,
	PieceMarkDown<PieceSelectable, keyof PieceSelectable>
> {
	constructor(
		pieceRoot = 'pieces-root',
		table: PieceTables = 'table' as PieceTables,
		validator: PieceValidator = {} as PieceValidator,
		schema: PieceCacheSchema = {} as PieceCacheSchema
	) {
		super(pieceRoot, table, validator, schema)
	}

	async toCreateInput(): Promise<PieceInsertable> {
		return {} as PieceInsertable
	}

	async toUpdateInput(): Promise<PieceUpdatable> {
		return {} as PieceUpdatable
	}

	async attach(): Promise<void> {
		return
	}

	async process(): Promise<void> {
		return
	}

	create(): PieceMarkDown<PieceSelectable, keyof PieceSelectable> {
		return {} as PieceMarkDown<PieceSelectable, keyof PieceSelectable>
	}

	async fetch(): Promise<PieceMarkDown<PieceSelectable, keyof PieceSelectable>> {
		return {} as PieceMarkDown<PieceSelectable, keyof PieceSelectable>
	}
}

export function makePiece() {
	return PieceExample
}
