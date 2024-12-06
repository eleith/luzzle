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
import Ajv from 'ajv'

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
		file_path: markdown.filePath,
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
	const update: PiecesItemsUpdateable = { date_updated: new Date().getTime() }

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

	if (force || markdown.filePath !== data.file_path) {
		update.file_path = markdown.filePath
	}

	return update
}

function validatePieceItem<F extends PieceFrontmatter>(
	markdown: PieceMarkdown<F>,
	validator: Ajv.ValidateFunction<F>
) {
	if (validator(markdown.frontmatter)) {
		return true
	}

	return false
}

function getValidatePieceItemErrors<F extends PieceFrontmatter>(
	validator: Ajv.ValidateFunction<F>
) {
	const errors = validator.errors || []
	return errors.map((e) => `\t${e.instancePath} ${e.message}`)
}

export {
	makePieceItemInsertable,
	makePieceItemUpdatable,
	validatePieceItem,
	getValidatePieceItemErrors,
}
