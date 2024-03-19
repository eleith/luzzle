import { client } from '@app/common/emailjs'
import { SMTPClient } from 'emailjs'
import config from '@app/common/config'
import { getDatabaseClient, LuzzleDatabase } from '@luzzle/core'

const db = getDatabaseClient(config.private.DATABASE_URL as string)

export interface Context {
	db: LuzzleDatabase
	email: SMTPClient
}

export function createContext(): Context {
	return { db, email: client }
}
