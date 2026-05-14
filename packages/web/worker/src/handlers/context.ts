import type { Config } from '@luzzle/web.config'
import type { Logger } from '../logger.js'
import type { RcloneClient } from '../utils/rclone.js'
import type { Kysely } from 'kysely'
import type { WebDatabase } from '../db.js'

export interface HandlerContext {
	config: Config
	logger: Logger
	rclone: RcloneClient
	db: Kysely<WebDatabase>
}
