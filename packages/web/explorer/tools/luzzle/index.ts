import { initialize } from './database'

const PRIVATE_DATABASE_URL = process.env.PRIVATE_DATABASE_URL as string

async function prebuildLuzzle() {
	console.log('[start] prebuilding luzzle...')
	const db = await initialize(PRIVATE_DATABASE_URL)

	const pieces = await db.selectFrom('web_pieces').selectAll().execute()

	const tags = await db.selectFrom('web_pieces_tags').selectAll().execute()

	console.log(`${PRIVATE_DATABASE_URL} has ${pieces.length} pieces and ${tags.length} tags`)
	console.log('[done] prebuilding luzzle')
}

await prebuildLuzzle()
