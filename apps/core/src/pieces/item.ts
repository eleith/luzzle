import { createId } from '@paralleldrive/cuid2'
import type {
	PiecesItemsSelectable,
	PiecesItemsInsertable,
	PiecesItemsUpdateable,
} from '../database/tables/pieces_items.schema.js'
import type { PieceMarkdown } from './utils/markdown.js'
import {
	type PieceFrontmatter,
	pieceFrontmatterValueToDatabaseValue,
	getPieceFrontmatterSchemaFields,
	type PieceFrontmatterSchema,
	type PieceFrontmatterProperty,
} from './utils/frontmatter.js'
import type { ValidateFunction } from 'ajv'

/**
 * Recursively collects asset paths from frontmatter values based on schema property definitions.
 */
function collectAssets(value: unknown, property: PieceFrontmatterProperty, assets: string[]) {
	if (value === undefined || value === null) {
		return
	}

	if (property.type === 'array') {
		const values = value as unknown[]
		if (property.items.format === 'asset') {
			assets.push(...(values as string[]))
		} else if (property.items.type === 'array' || property.items.type === 'object') {
			values.forEach((v) =>
				collectAssets(v, property.items, assets)
			)
		}
	} else if (property.type === 'object') {
		const obj = value as Record<string, unknown>
		for (const key in property.properties) {
			collectAssets(
				obj[key],
				property.properties[key],
				assets
			)
		}
	} else if (property.format === 'asset') {
		assets.push(value as string)
	}
}

function makePieceItemInsertable<F extends PieceFrontmatter>(
	piece: string,
	markdown: PieceMarkdown<F>,
	schema: PieceFrontmatterSchema<F>
): PiecesItemsInsertable {
	const frontmatterJson = {} as Record<string, unknown>
	const fields = getPieceFrontmatterSchemaFields(schema)
	const assets: string[] = []

	fields.forEach((field) => {
		const name = field.name
		const value = markdown.frontmatter[name]
		const jsonValue = pieceFrontmatterValueToDatabaseValue(value, field)

		collectAssets(value, field, assets)

		frontmatterJson[name] = jsonValue
	})

	const insertable: PiecesItemsInsertable = {
		id: createId(),
		file_path: markdown.filePath,
		note_markdown: markdown.note as string,
		frontmatter_json: JSON.stringify(frontmatterJson),
		type: piece,
	}

	if (assets.length) {
		insertable.assets_json_array = JSON.stringify(assets)
	}

	return insertable
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
	const assets: string[] = []

	fields.forEach((field) => {
		const name = field.name
		const value = (markdown.frontmatter as Record<string, unknown>)[name]
		const updateValue = pieceFrontmatterValueToDatabaseValue(value, field)

		collectAssets(value, field, assets)

		frontmatter[name] = updateValue
	})

	const frontmatterJson = JSON.stringify(frontmatter)
	const assetString = JSON.stringify(assets)

	if (force || frontmatterJson !== data.frontmatter_json) {
		update.frontmatter_json = frontmatterJson
	}

	if (force || markdown.note !== data.note_markdown) {
		update.note_markdown = markdown.note as string
	}

	if (force || markdown.filePath !== data.file_path) {
		update.file_path = markdown.filePath
	}

	if (force || data.assets_json_array !== assetString) {
		update.assets_json_array = assetString !== '[]' ? assetString : undefined
	}

	return update
}

function validatePieceItem<F extends PieceFrontmatter>(
	markdown: PieceMarkdown<F>,
	validator: ValidateFunction<F>
) {
	if (validator(markdown.frontmatter)) {
		return true
	}

	return false
}

function getValidatePieceItemErrors<F extends PieceFrontmatter>(validator: ValidateFunction<F>) {
	const errors = validator.errors || []
	return errors.map((e) => `\t${e.instancePath} ${e.message}`)
}

export {
	makePieceItemInsertable,
	makePieceItemUpdatable,
	validatePieceItem,
	getValidatePieceItemErrors,
}
