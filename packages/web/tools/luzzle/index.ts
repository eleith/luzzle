import { initialize } from './database'

const PRIVATE_DATABASE_URL = process.env.PRIVATE_DATABASE_URL as string

async function prebuildLuzzle() {
	console.log('[start] prebuilding luzzle...')
	const db = await initialize(PRIVATE_DATABASE_URL)

	const pieces = await db
		.selectFrom('web_pieces')
		.selectAll()
		.orderBy('date_consumed', 'desc')
		.orderBy('type', 'asc')
		.execute()

	console.log(pieces.length, PRIVATE_DATABASE_URL)

	console.log('[done] prebuilding luzzle')
}

await prebuildLuzzle()
