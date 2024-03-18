import { createId } from '@paralleldrive/cuid2'
import {
	PieceSelectable,
	PieceInsertable,
	PieceUpdatable,
	Pieces,
} from '../tables/pieces.schema.js'
import { PieceMarkdown } from '../pieces/markdown.js'
import {
	getPieceFrontmatterKeysFromSchema,
	PieceFrontmatter,
	PieceFrontmatterFields,
	PieceFrontmatterJtdSchema,
	unformatPieceFrontmatterValue,
} from '../pieces/frontmatter.js'

function makePieceInsertable<
	P extends Pieces,
	F extends PieceFrontmatter<PieceSelectable, PieceFrontmatterFields | void>
>(markdown: PieceMarkdown<F>, schema: PieceFrontmatterJtdSchema<F>): PieceInsertable<P> {
	const input = {
		id: createId(),
		slug: markdown.slug,
		note: markdown.note,
	} as Record<string, unknown>

	const frontmatterSchema = getPieceFrontmatterKeysFromSchema(schema)
	const frontmatterKeys = Object.keys(markdown.frontmatter) as (keyof F)[]
	const inputKeys = frontmatterKeys.filter(
		(key) => !['id', 'slug', 'date_added', 'date_updated'].includes(key as string)
	)

	inputKeys.forEach((key) => {
		const value = markdown.frontmatter[key]
		const schemaKey = frontmatterSchema.find((f) => f.name === key)

		if (schemaKey) {
			const format = schemaKey.metadata?.format
			const isArray = schemaKey.collection === 'array'

			if (isArray) {
				if (Array.isArray(value)) {
					input[key as string] = JSON.stringify(
						value.map((v) => unformatPieceFrontmatterValue(v, format))
					)
				}
			} else {
				input[key as string] = unformatPieceFrontmatterValue(value, format)
			}
		}
	})

	return input as PieceInsertable<P>
}

function makePieceUpdatable<
	P extends Pieces,
	F extends PieceFrontmatter<PieceSelectable, PieceFrontmatterFields | void>,
	D extends PieceSelectable
>(
	markdown: PieceMarkdown<F>,
	schema: PieceFrontmatterJtdSchema<F>,
	data: D,
	force = false
): PieceUpdatable<P> {
	const update = {
		date_updated: new Date().getTime(),
	} as Record<string, unknown>

	const frontmatterSchema = getPieceFrontmatterKeysFromSchema(schema)

	frontmatterSchema.forEach((schema) => {
		const fieldName = schema.name
		const value = markdown.frontmatter[fieldName as keyof F]
		const format = schema.metadata?.format
		const isArray = schema.collection === 'array'
		const dataValue = data[fieldName as keyof D] as unknown
		const updateValue =
			isArray && Array.isArray(value)
				? JSON.stringify(value.map((v) => unformatPieceFrontmatterValue(v, format)))
				: unformatPieceFrontmatterValue(value, format)

		if (force || dataValue !== updateValue) {
			update[fieldName] = updateValue
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
