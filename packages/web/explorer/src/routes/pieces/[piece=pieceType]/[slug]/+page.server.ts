import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { db } from '$lib/server/database'
import { getOpenGraphPath } from '@luzzle/tools/browser'
import { config } from '$lib/server/config'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'

export const load: PageServerLoad = async (page) => {
	const type = page.params.piece
	const slug = page.params.slug

	const piece = await db
		.selectFrom('web_pieces')
		.selectAll()
		.where('type', '=', type)
		.where('slug', '=', slug)
		.executeTakeFirst()

	if (!piece) {
		return error(404, `piece does not exist`)
	}

	const tags = await db
		.selectFrom('web_pieces_tags')
		.select(['slug', 'tag'])
		.where('piece_id', '=', piece.id)
		.execute()

	const metadata = JSON.parse(piece.json_metadata || '{}') as Record<string, unknown>
	const note = piece.note
		? String(
				await unified()
					.use(remarkParse)
					.use(remarkRehype)
					.use(rehypeStringify)
					.process(piece.note)
		  )
		: null
	const summary = piece.summary
		? String(
				await unified()
					.use(remarkParse)
					.use(remarkRehype)
					.use(rehypeStringify)
					.process(piece.summary)
		  )
		: null

	return {
		piece,
		tags,
		metadata,
		html: {
			note,
			summary
		},
		meta: {
			title: piece.title,
			type: piece.type,
			description: piece.note || piece.summary,
			image: `${config.url.luzzle_assets}/pieces/assets/${getOpenGraphPath(piece.type, piece.id)}`
		}
	}
}
