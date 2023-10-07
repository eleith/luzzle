import { PieceCache } from './cache.js'
import { PieceDatabase } from './piece.js'
import { JTDSchemaType } from 'ajv/dist/core.js'
import { PieceMarkDown } from './markdown.js'
import Ajv from 'ajv/dist/jtd.js'

type PieceSample = {
	title: string
	extra: string
}

type PieceMarkdownSample = PieceMarkDown<PieceSample, 'extra'>
type PieceValidator = Ajv.ValidateFunction<PieceMarkdownSample>

export function makeValidator() {
	return (() => true) as unknown as PieceValidator
}

export function makeCacheSchema() {
	return {} as JTDSchemaType<PieceCache<PieceDatabase>>
}

export function makeMarkdownSample(): PieceMarkdownSample {
	return {
		filename: 'sample.md',
		markdown: 'notes here',
		frontmatter: { title: 'title here' },
	}
}
