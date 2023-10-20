import { PieceSelectable } from '@luzzle/kysely'
import Ajv from 'ajv/dist/jtd.js'
import { addFrontMatter } from '../md.js'

export type PieceMarkDown<T extends PieceSelectable, K extends keyof T> = {
	slug: string
	markdown?: string
	frontmatter: Omit<Pick<T, NonNullableKeys<T>> & Partial<UnNullify<Pick<T, NullableKeys<T>>>>, K>
}

export function toValidatedMarkDown<
	Y extends PieceMarkDown<PieceSelectable, keyof PieceSelectable>
>(slug: string, markdown: unknown, frontmatter: unknown, validator: Ajv.ValidateFunction<Y>): Y {
	const md = {
		slug,
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

	throw new Error(`${slug} is not valid, errors: ${message}`)
}

export function toMarkDownString<T extends PieceSelectable, K extends keyof T>(
	markdown: PieceMarkDown<T, K>
): string {
	return addFrontMatter(markdown.markdown, markdown.frontmatter)
}
