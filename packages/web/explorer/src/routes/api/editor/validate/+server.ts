import { json } from '@sveltejs/kit'
import { compile } from '@luzzle/core'
import { getPieces } from '$lib/server/pieces'
import { remark } from 'remark'
import recommended from 'remark-preset-lint-recommended'
import consistent from 'remark-preset-lint-consistent'
import duplicateHeadings from 'remark-lint-no-duplicate-headings'
import headingIncrement from 'remark-lint-heading-increment'
import type { RequestHandler } from './$types'
import type { ValidationError, ValidationResponse } from '$lib/types/validation'

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { type, data, markdown } = await request.json()

		if (!type || !data) {
			return json(
				{
					valid: false,
					errors: [{ message: 'Missing type or data', source: 'frontmatter' }]
				} satisfies ValidationResponse,
				{ status: 400 }
			)
		}

		const pieces = getPieces()
		const piece = await pieces.getPiece(type)

		if (!piece) {
			return json(
				{
					valid: false,
					errors: [{ message: `Piece type ${type} not found`, source: 'frontmatter' }]
				} satisfies ValidationResponse,
				{ status: 404 }
			)
		}

		const errors: ValidationError[] = []

		// 1. Validate Frontmatter (AJV)
		const validate = compile(piece.schema)
		const validFrontmatter = validate(data)

		if (!validFrontmatter) {
			;(validate.errors || []).forEach((err) => {
				errors.push({
					message: err.message || 'Unknown error',
					path: err.instancePath,
					keyword: err.keyword,
					params: err.params,
					source: 'frontmatter'
				})
			})
		}

		// 2. Validate Markdown (Remark)
		if (markdown) {
			try {
				const file = await remark()
					.use(recommended)
					.use(consistent)
					.use(duplicateHeadings)
					.use(headingIncrement)
					.process(markdown)

				file.messages.forEach((msg) => {
					errors.push({
						message: msg.reason,
						line: msg.line || undefined,
						column: msg.column || undefined,
						ruleId: msg.ruleId || undefined,
						source: 'markdown'
					})
				})
			} catch (e) {
				errors.push({
					message: `Markdown validation failed: ${e instanceof Error ? e.message : String(e)}`,
					source: 'markdown'
				})
			}
		}

		const response: ValidationResponse = {
			valid: errors.length === 0,
			errors
		}

		return json(response)
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e)
		return json(
			{ valid: false, errors: [{ message, source: 'frontmatter' }] } satisfies ValidationResponse,
			{ status: 500 }
		)
	}
}
