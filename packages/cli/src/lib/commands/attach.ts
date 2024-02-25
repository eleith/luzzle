import log from '../log.js'
import { Argv } from 'yargs'
import { Command } from './utils/types.js'
import {
	PieceArgv,
	PieceCommandOption,
	makePieceCommand,
	parsePieceArgv,
	downloadFileOrUrlTo,
} from '../pieces/index.js'
import { unlink } from 'fs/promises'

export type AttachArgv = { file: string; name?: string; field?: string } & PieceArgv

const command: Command<AttachArgv> = {
	name: 'attach',

	command: `attach ${PieceCommandOption} <file|url>`,

	describe: 'attach a file to a piece field',

	builder: function <T>(yargs: Argv<T>) {
		return makePieceCommand(yargs)
			.positional('file', {
				type: 'string',
				alias: 'url',
				description: 'file to attach',
				demandOption: 'file (or url) is required',
			})
			.option('field', {
				type: 'string',
				description: 'field to attach file to',
			})
			.option('name', {
				type: 'string',
				description: 'rename file to this name, defaults to [slug]',
			})
	},

	run: async function (ctx, args) {
		const { slug, piece } = parsePieceArgv(args)
		const { file, field, name } = args
		const pieces = await ctx.pieces.getPiece(piece)
		const markdown = await pieces.get(slug)

		if (!markdown) {
			log.error(`${slug} was not found`)
			return
		}

		const attachables = pieces.getSchemaKeys().filter((f) => f.metadata?.format === 'attachment')
		const attachableField = field
			? attachables.find((f) => f.name === field)?.name
			: attachables.find((f) => f.collection === undefined)?.name

		if (attachables.length === 0) {
			log.error(`this piece does not allow attachments`)
			return
		}

		if (!attachableField) {
			log.error(`please specify an attachable field such as: ${attachables.join(', ')}`)
			return
		}

		if (ctx.flags.dryRun === false) {
			const tempPath = await downloadFileOrUrlTo(file)
			try {
				const attachedMarkdown = await pieces.attach(tempPath, markdown, attachableField, name)
				await pieces.write(attachedMarkdown)
			} catch (err) {
				log.error(err)
			} finally {
				await unlink(tempPath)
			}
		}

		log.info(`uploaded ${file} to ${pieces.getFileName(slug)}`)
	},
}

export default command
