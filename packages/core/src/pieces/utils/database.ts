import { createId } from '@paralleldrive/cuid2'
import { PieceSelectable, PieceInsertable, PieceUpdatable, Pieces } from '../tables.schema.js'
import { PieceMarkdown } from './markdown.js'
import {
	PieceFrontmatter,
	PieceFrontmatterSchema,
	pieceFrontmatterValueToDatabaseValue,
	getPieceFrontmatterSchemaFields,
} from './frontmatter.js'
import { PieceCommonDatabaseFieldNames } from '../types/common.js'

function makePieceInsertable<P extends Pieces, F extends PieceFrontmatter>(
	markdown: PieceMarkdown<F>,
	schema: PieceFrontmatterSchema<F>
): PieceInsertable<P> {
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

	return input as PieceInsertable<P>
}

function makePieceUpdatable<
	P extends Pieces,
	F extends PieceFrontmatter,
	D extends PieceSelectable,
>(
	markdown: PieceMarkdown<F>,
	schema: PieceFrontmatterSchema<F>,
	data: D,
	force = false
): PieceUpdatable<P> {
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

	return update as PieceUpdatable<P>
}

export { makePieceInsertable, makePieceUpdatable }
