import { client } from '@app/common/emailjs'
import { SMTPClient } from 'emailjs'
import config from '@app/common/config'
import { getDatabaseClient } from '@luzzle/core'
import { WebPieces, WebPiecesFTS5 } from '@app/common/graphql/piece/objects/piece'

const coreDatabase = getDatabaseClient(config.private.DATABASE_URL as string)
const webDatabase = coreDatabase.withTables<{
	web_pieces: WebPieces
	web_pieces_fts5: WebPiecesFTS5
}>()

export interface Context {
	db: typeof webDatabase
	email: SMTPClient
}

export function createContext(): Context {
	return { db: webDatabase, email: client }
}
