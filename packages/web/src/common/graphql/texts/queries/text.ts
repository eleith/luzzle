import builder from '@app/lib/graphql/builder'
import TextObject from '../objects/text'

builder.queryFields((t) => ({
	text: t.field({
		errors: {
			types: [Error],
		},
		type: TextObject,
		args: {
			id: t.arg({ type: 'String' }),
			slug: t.arg({ type: 'String' }),
		},
		resolve: async (_, args, ctx) => {
			const { slug, id } = args

			if (slug) {
				return await ctx.db
					.selectFrom('texts')
					.selectAll()
					.where('slug', '=', slug)
					.executeTakeFirstOrThrow()
			} else if (id) {
				return await ctx.db
					.selectFrom('texts')
					.selectAll()
					.where('id', '=', id)
					.executeTakeFirstOrThrow()
			} else {
				const find = await ctx.db
					.selectFrom('texts')
					.select(ctx.db.fn.count<number>('id').as('count'))
					.executeTakeFirstOrThrow()
				const skip = Math.floor(Math.random() * find.count)

				return await ctx.db
					.selectFrom('texts')
					.selectAll()
					.limit(1)
					.offset(skip)
					.executeTakeFirstOrThrow()
			}
		},
	}),
}))
