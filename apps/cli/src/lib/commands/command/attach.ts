import log from '../../../lib/log.js'
import { type Command } from '../utils/types.js'
import { Argv } from 'yargs'
import { createReadStream } from 'fs'
import { stat } from 'fs/promises'
import path from 'path'
import { savePieceAsset } from '@luzzle/core'
import {
	PieceArgv,
	PiecePositional,
	makePiecePathPositional,
	parsePiecePathPositionalArgv,
} from '../utils/pieces.js'

export type AttachArgv = {
	file: string
} & PieceArgv

const command: Command<AttachArgv> = {
	name: 'attach',

	command: `attach ${PiecePositional} <file>`,

	describe: 'attach a local file to a piece',

	builder: <T>(yargs: Argv<T>) => {
		return makePiecePathPositional(yargs).positional('file', {
			type: 'string',
			description: 'path to the local file to attach',
			demandOption: 'local file path is required',
		}) as Argv<T & AttachArgv>
	},

	run: async function (ctx, args) {
		const { file } = args
		const { markdown } = await parsePiecePathPositionalArgv(ctx, args)

		// Resolve local file path
		const localFilePath = path.resolve(file)
		const fileStat = await stat(localFilePath).catch(() => null)

		if (!fileStat || !fileStat.isFile()) {
			log.error(`local file [${file}] not found or is not a valid file`)
			return
		}

		if (ctx.flags.dryRun) {
			log.info(`[dry-run] would attach ${file} to ${markdown.filePath}`)
			return
		}

		try {
			const stream = createReadStream(localFilePath)
			const filename = path.basename(localFilePath)

			const relativePath = await savePieceAsset(
				markdown.filePath,
				filename,
				stream,
				ctx.storage
			)

			console.log(relativePath)
		} catch (error) {
			log.error(`failed to attach file: ${(error as Error).message}`)
		}
	},
}

export default command
