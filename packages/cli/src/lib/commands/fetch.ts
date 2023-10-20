import log from '../log.js'
import { Command } from './utils/types.js'
import { Argv } from 'yargs'
import { PieceArgv, PieceCommandOption, makePieceCommand, parsePieceArgv } from '../pieces/index.js'

type FetchServices = 'google' | 'openlibrary' | 'openai' | 'all'

export type FetchArgv = {
	service: FetchServices
} & PieceArgv

const command: Command<FetchArgv> = {
	name: 'fetch',

	command: `fetch ${PieceCommandOption} [service]`,

	describe: 'fetch metadata for piece with [google|openlibrary|openai|all]',

	builder: <FetchArgv>(yargs: Argv<FetchArgv>) => {
		return makePieceCommand(yargs).option('service', {
			type: 'string',
			description: 'fetch metadata with a specific service',
			choices: ['google', 'openlibrary', 'openai', 'all'],
			default: 'all' as FetchServices,
		})
	},

	run: async function (ctx, args) {
		const { slug, piece } = parsePieceArgv(args)
		const pieces = await ctx.pieces.getPiece(piece)

		const markdown = await pieces.get(slug)

		if (!markdown) {
			log.info(`${slug} was not found`)
			return
		}

		if (ctx.flags.dryRun === false) {
			const fetchedMarkdown = await pieces.fetch(ctx.config, args, markdown)
			await pieces.write(fetchedMarkdown)
		}

		log.info(`fetched ${slug}`)
	},
}

export default command
