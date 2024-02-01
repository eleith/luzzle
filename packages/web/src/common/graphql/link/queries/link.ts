import builder from '@app/lib/graphql/builder'
import LinkObject from '../objects/link'

builder.queryFields((t) => ({
	link: t.field({
		errors: {
			types: [Error],
		},
		type: LinkObject,
		args: {
			id: t.arg({ type: 'String' }),
			slug: t.arg({ type: 'String' }),
		},
		resolve: async (_, args, ctx) => {
			const { slug, id } = args

			if (slug) {
				return await ctx.db
					.selectFrom('links')
					.selectAll()
					.where('slug', '=', slug)
					.executeTakeFirstOrThrow()
			} else if (id) {
				return await ctx.db
					.selectFrom('links')
					.selectAll()
					.where('id', '=', id)
					.executeTakeFirstOrThrow()
			} else {
				const find = await ctx.db
					.selectFrom('links')
					.select(ctx.db.fn.count<number>('id').as('link_count'))
					.executeTakeFirstOrThrow()
				const skip = Math.floor(Math.random() * find.link_count)
				const link = await ctx.db
					.selectFrom('links')
					.selectAll()
					.limit(1)
					.offset(skip)
					.executeTakeFirstOrThrow()
				return link
			}
		},
	}),
}))
