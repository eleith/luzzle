import {
	PiecesItemsSelectable,
	PieceFrontmatter,
	PieceMarkdown,
	compile,
	PieceFrontmatterSchema,
} from '@luzzle/core'
import Piece from './piece.js'
import { PieceManagerSelect } from '@luzzle/core/dist/src/database/tables/pieces_manager.schema.js'

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

export function makeSample(): PiecesItemsSelectable {
	return {
		...sample,
	} as PiecesItemsSelectable
}

class PieceOverridable extends Piece<PiecesItemsSelectable, PieceFrontmatter> {
	constructor(
		overrides: {
			root?: string
			name?: string
			schema?: PieceFrontmatterSchema<PieceFrontmatter> | null
		} = {}
	) {
		const root = overrides.root || 'pieces-root'
		const name = overrides.name || 'table'
		const schema = overrides.schema === null ? undefined : overrides.schema || makeSchema(name)

		super(root, name, schema)
	}
}

export function makePiece() {
	return PieceOverridable
}

export function makeRegisteredPiece(overrides?: Partial<PieceManagerSelect>): PieceManagerSelect {
	return {
		id: `123lk12j3lj12k3${Math.random()}`,
		date_added: new Date().getTime(),
		date_updated: new Date().getTime(),
		name: 'asdf',
		schema: 'asdf',
		...overrides,
	}
}
