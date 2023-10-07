import Ajv from 'ajv/dist/jtd.js'
import { addFrontMatter } from '../md.js'
import { PieceDatabase } from './piece.js'

export type PieceMarkDown<T extends Record<string, unknown>, K extends keyof T> = {
	filename: string
	markdown?: string
	frontmatter: Omit<Pick<T, NonNullableKeys<T>> & Partial<UnNullify<Pick<T, NullableKeys<T>>>>, K>
}

export function toValidatedMarkDown<Y extends PieceMarkDown<Record<string, unknown>, string>>(
	filename: string,
	markdown: unknown,
	frontmatter: unknown,
	validator: Ajv.ValidateFunction<Y>
): Y {
	const md = {
		filename,
		frontmatter,
		markdown,
	} as Y

	if (validator(md)) {
		return md
	}

	const message = validator.errors
		?.map((x) => {
			return `${x.instancePath} -> ${x.message}`
		})
		.join(' | ')

	throw new Error(`${filename} is not valid, errors: ${message}`)
}

export function toMarkDownString<T extends PieceDatabase, K extends keyof T>(
	markdown: PieceMarkDown<T, K>
): string {
	return addFrontMatter(markdown.markdown, markdown.frontmatter)
}
