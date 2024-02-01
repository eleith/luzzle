import builder from '@app/lib/graphql/builder'
import zod, { ZodError } from 'zod'

const DiscussionInput = builder.inputType('DiscussionInput', {
	fields: (t) => ({
		slug: t.string({ required: true }),
		email: t.string({ required: true, validate: { email: true } }),
		discussion: t.string({ required: true, validate: { maxLength: 1024 } }),
		type: t.string({ required: true, validate: { schema: zod.enum(['links', 'books']) } }),
		topic: t.string({
			required: true,
			validate: {
				schema: zod.enum(['reflection', 'recommendation', 'reflection-critical']),
			},
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
			const table = type == 'links' ? 'links' : 'books'

			try {
				const item = await ctx.db
					.selectFrom(table)
					.select('title')
					.where('slug', '=', slug)
					.executeTakeFirstOrThrow()

				await ctx.email.sendAsync({
					text: `topic: ${topic}\nfrom: ${email}\n\ndiscussion:\n--\n\n${discussion}`,
					'reply-to': email,
					from: 'online-hi-eleith-com@eleith.com',
					to: 'online-hi-eleith-com@eleith.com',
					subject: `discussion on ${item.title}`,
				})

				return true
			} catch (error) {
				if (error instanceof Error && error?.name === 'NotFoundError') {
					throw new Error(`${table} ${slug} not found`)
				} else {
					console.error(error)
					throw new Error('internal error. could send discussion')
				}
			}
		},
	}),
}))

builder.mutationFields((t) => ({
	createBookRecommendation: t.boolean({
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
