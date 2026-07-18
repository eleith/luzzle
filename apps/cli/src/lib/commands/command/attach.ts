import log from '../../../lib/log.js'
import type { Command } from '../utils/types.js'
import type { Argv } from 'yargs'
import { savePieceAsset } from '@luzzle/core'
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

const command: Command<AttachArgv> = {
	name: 'attach',

	command: `attach ${PiecePositional} <file>`,

	describe: 'attach a local file to a piece',

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

		if (ctx.flags.dryRun) {
			const isUrl = /https?:\/\//i.test(file)
			if (isUrl) {
				log.info(`[dry-run] would download and attach ${file} to ${markdown.filePath}`)
			} else {
				log.info(`[dry-run] would attach ${file} to ${markdown.filePath}`)
			}
			return
		}

		try {
			const relativePath = await savePieceAsset(
				markdown.filePath,
				file,
				ctx.storage,
				{ name }
			)

			console.log(relativePath)
		} catch (error) {
			log.error(`failed to attach file: ${(error as Error).message}`)
		}
	},
}

export default command
