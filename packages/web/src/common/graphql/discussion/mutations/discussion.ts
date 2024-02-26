import builder from '@app/lib/graphql/builder'
import { Piece, Pieces } from '@luzzle/kysely'
import { ZodError } from 'zod'

const PieceTypeRegExp = new RegExp(Object.values(Piece).join('|'))

const DiscussionInput = builder.inputType('DiscussionInput', {
	fields: (t) => ({
		slug: t.string({ required: true }),
		email: t.string({ required: true, validate: { email: true } }),
		discussion: t.string({ required: true, validate: { maxLength: 1024 } }),
		type: t.string({ required: true, validate: (x) => PieceTypeRegExp.test(x) }),
		topic: t.string({
			required: true,
			validate: (x) => /reflection|recommendation|reflection-critical/.test(x),
		}),
	}),
})

const RecommendationInput = builder.inputType('RecommendationInput', {
	fields: (t) => ({
		email: t.string({ required: true, validate: { email: true } }),
		recommendation: t.string({ required: true, validate: { maxLength: 1024 } }),
	}),
})

builder.mutationFields((t) => ({
	createDiscussion: t.boolean({
		errors: {
			types: [ZodError, Error],
		},
		args: {
			input: t.arg({ type: DiscussionInput, required: true }),
		},
		resolve: async (_, args, ctx) => {
			const { slug, email, discussion, topic, type } = args.input

			try {
				const item = await ctx.db
					.selectFrom(type as Pieces)
					.select('title')
					.where('slug', '=', slug)
					.executeTakeFirstOrThrow()

				console.log(topic, email, discussion, type, slug, item)

				await ctx.email.sendAsync({
					text: `topic: ${topic}\r\nfrom: ${email}\r\n\r\ndiscussion:\r\n--\r\n\r\n${discussion}`,
					'reply-to': email,
					from: 'online-hi-eleith-com@eleith.com',
					to: 'online-hi-eleith-com@eleith.com',
					subject: `discussion on ${item.title}`,
				})

				return true
			} catch (error) {
				if (error instanceof Error && error?.name === 'NotFoundError') {
					throw new Error(`${type} ${slug} not found`)
				} else {
					console.error(error)
					throw new Error('internal error. could not send discussion')
				}
			}
		},
	}),
}))

builder.mutationFields((t) => ({
	createRecommendation: t.boolean({
		errors: {
			types: [ZodError, Error],
		},
		args: {
			input: t.arg({ type: RecommendationInput, required: true }),
		},
		resolve: async (_, args, ctx) => {
			const { email, recommendation } = args.input

			try {
				await ctx.email.sendAsync({
					text: `from: ${email}\n\nrecommendation:\n--\n\n${recommendation}`,
					'reply-to': email,
					from: 'online-hi-eleith-com@eleith.com',
					to: 'online-hi-eleith-com@eleith.com',
					subject: `recommendation`,
				})

				return true
			} catch (error) {
				console.error(error)
				throw new Error('internal error. could not send recommendation')
			}
		},
	}),
}))
