import { createId } from '@paralleldrive/cuid2'
import {
	PiecesItemsInsertable,
	PiecesItemsSelectable,
	PiecesItemsUpdateable,
} from './tables.schema.js'
import { PieceMarkdown } from './utils/markdown.js'
import {
	PieceFrontmatter,
	PieceFrontmatterSchema,
	pieceFrontmatterValueToDatabaseValue,
	getPieceFrontmatterSchemaFields,
} from './utils/frontmatter.js'
import { PieceCommonDatabaseFieldNames } from './types/common.js'

function makePieceItemInsertable<F extends PieceFrontmatter>(
	markdown: PieceMarkdown<F>,
	schema: PieceFrontmatterSchema<F>
): PiecesItemsInsertable {
	const input = {
		id: createId(),
		slug: markdown.slug,
		note: markdown.note,
	} as Record<string, unknown>

	const frontmatterFields = getPieceFrontmatterSchemaFields(schema)
	const inputFields = frontmatterFields.filter(
		(field) => !PieceCommonDatabaseFieldNames.includes(field.name)
	)

	inputFields.forEach((field) => {
		const name = field.name
		const value = markdown.frontmatter[name]
		input[name] = pieceFrontmatterValueToDatabaseValue(value, field)
	})

	return input as PiecesItemsInsertable
}

function makePieceItemUpdatable<F extends PieceFrontmatter, D extends PiecesItemsSelectable>(
	markdown: PieceMarkdown<F>,
	schema: PieceFrontmatterSchema<F>,
	data: D,
	force = false
): PiecesItemsUpdateable {
	const update = {
		date_updated: new Date().getTime(),
	} as Record<string, unknown>

	const fields = getPieceFrontmatterSchemaFields(schema)

	fields.forEach((field) => {
		const name = field.name
		const value = markdown.frontmatter[name as keyof F]
		const dataValue = data[name as keyof D] as unknown
		const updateValue = pieceFrontmatterValueToDatabaseValue(value, field)

		if (force || dataValue !== updateValue) {
			update[name] = updateValue
		}
	})

	if (force || markdown.note !== data.note) {
		update['note'] = markdown.note
	}

	if (force || markdown.slug !== data.slug) {
		update['slug'] = markdown.slug
	}

	return update as PiecesItemsUpdateable
}

export { makePieceItemInsertable, makePieceItemUpdatable }
