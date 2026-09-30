import log from '../../../lib/log.js'
import type { Command } from '../utils/types.js'
import type { Argv } from 'yargs'
import { savePieceAsset } from '@luzzle/core'
import { open } from 'fs/promises'
import path from 'path'
import type {
	PieceArgv} from '../utils/pieces.js';
import {
	PiecePositional,
	makePiecePathPositional,
	parsePiecePathPositionalArgv,
} from '../utils/pieces.js'

export type AttachArgv = {
	file: string
	name?: string
} & PieceArgv

function attachmentFilename(file: string, name?: string) {
	if (!name) return path.basename(file)
	if (path.extname(name)) return name
	return name + path.extname(file)
}

const command: Command<AttachArgv> = {
	name: 'attach',

	command: `attach ${PiecePositional} <file>`,

	describe: 'attach a local file or URL to a piece',

	builder: <T>(yargs: Argv<T>) => {
		return makePiecePathPositional(yargs)
			.positional('file', {
				type: 'string',
				description: 'path to the local file or URL to attach',
				demandOption: 'file path or URL is required',
			})
			.option('name', {
				alias: 'n',
				type: 'string',
				description: 'custom filename for the attachment (optional)',
			}) as Argv<T & AttachArgv>
	},

	run: async function (ctx, args) {
		const { file, name } = args
		const { markdown } = await parsePiecePathPositionalArgv(ctx, args)
		const isRemoteUrl = /^https?:\/\//i.test(file) && URL.canParse(file)
		const remoteOrigin = isRemoteUrl ? new URL(file).origin : undefined

		if (ctx.flags.dryRun) {
			if (remoteOrigin) {
				log.info(`[dry-run] would download and attach from ${remoteOrigin} to ${markdown.filePath}`)
			} else {
				log.info(`[dry-run] would attach ${file} to ${markdown.filePath}`)
			}
			return
		}

		try {
			if (remoteOrigin) {
				const relativePath = await savePieceAsset(markdown.filePath, file, ctx.storage, { name })
				console.log(relativePath)
			} else {
				const handle = await open(file, 'r')
				const stream = handle.createReadStream()
				try {
					const relativePath = await savePieceAsset(
						markdown.filePath,
						attachmentFilename(file, name),
						stream,
						ctx.storage
					)
					console.log(relativePath)
				} finally {
					stream.destroy()
				}
			}
		} catch (error) {
			log.error(
				remoteOrigin
					? `failed to attach downloaded file from ${remoteOrigin}`
					: `failed to attach file: ${(error as Error).message}`
			)
		}
	},
}

export default command
