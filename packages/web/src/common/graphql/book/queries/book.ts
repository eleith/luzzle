import builder from '@app/lib/graphql/builder'
import BookObject from '../objects/book'

builder.queryFields((t) => ({
	book: t.field({
		errors: {
			types: [Error],
		},
		type: BookObject,
		args: {
			id: t.arg({ type: 'String' }),
			slug: t.arg({ type: 'String' }),
		},
		resolve: async (_, args, ctx) => {
			const { slug, id } = args

			if (slug) {
				return await ctx.db
					.selectFrom('books')
					.selectAll()
					.where('slug', '=', slug)
					.executeTakeFirstOrThrow()
			} else if (id) {
				return await ctx.db
					.selectFrom('books')
					.selectAll()
					.where('id', '=', id)
					.executeTakeFirstOrThrow()
			} else {
				const find = await ctx.db
					.selectFrom('books')
					.select(ctx.db.fn.count<number>('id').as('book_count'))
					.executeTakeFirstOrThrow()
				const skip = Math.floor(Math.random() * find.book_count)
				const book = await ctx.db
					.selectFrom('books')
					.selectAll()
					.limit(1)
					.offset(skip)
					.executeTakeFirstOrThrow()
				return book
			}
		},
	}),
}))
