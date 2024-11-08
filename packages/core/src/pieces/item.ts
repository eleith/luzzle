import { createId } from '@paralleldrive/cuid2'
import {
	PiecesItemsSelectable,
	PiecesItemsInsertable,
	PiecesItemsUpdateable,
} from '../database/tables/pieces_items.schema.js'
import { PieceMarkdown } from './utils/markdown.js'
import {
	PieceFrontmatter,
	PieceFrontmatterSchema,
	pieceFrontmatterValueToDatabaseValue,
	getPieceFrontmatterSchemaFields,
} from './utils/frontmatter.js'

function makePieceItemInsertable<F extends PieceFrontmatter>(
	piece: string,
	markdown: PieceMarkdown<F>,
	schema: PieceFrontmatterSchema<F>
): PiecesItemsInsertable {
	const frontmatterJson = {} as Record<string, unknown>
	const fields = getPieceFrontmatterSchemaFields(schema)

	fields.forEach((field) => {
		const name = field.name
		const value = markdown.frontmatter[name]
		frontmatterJson[name] = pieceFrontmatterValueToDatabaseValue(value, field)
	})

	return {
		id: createId(),
		slug: markdown.slug,
		note_markdown: markdown.note as string,
		frontmatter_json: JSON.stringify(frontmatterJson),
		type: piece,
	}
}

function makePieceItemUpdatable<F extends PieceFrontmatter>(
	markdown: PieceMarkdown<F>,
	schema: PieceFrontmatterSchema<F>,
	data: PiecesItemsSelectable,
	force = false
): PiecesItemsUpdateable {
	const frontmatter = {} as Record<string, unknown>
	const fields = getPieceFrontmatterSchemaFields(schema)
	const update: PiecesItemsUpdateable = { date_updated: new Date().getTime(), id: data.id }

	fields.forEach((field) => {
		const name = field.name
		const value = markdown.frontmatter[name as keyof F]
		const updateValue = pieceFrontmatterValueToDatabaseValue(value, field)

		frontmatter[name] = updateValue
	})

	const frontmatterJson = JSON.stringify(frontmatter)

	if (force || frontmatterJson !== data.frontmatter_json) {
		update.frontmatter_json = JSON.stringify(frontmatter)
	}

	if (force || markdown.note !== data.note_markdown) {
		update.note_markdown = markdown.note as string
	}

	if (force || markdown.slug !== data.slug) {
		update.slug = markdown.slug
	}

	return update
}

export { makePieceItemInsertable, makePieceItemUpdatable }
