import builder from '@app/lib/graphql/builder'
import { Pieces } from '@luzzle/kysely'
import PieceObject from '../objects/piece'

builder.queryFields((t) => ({
	piece: t.field({
		errors: {
			types: [Error],
		},
		type: PieceObject,
		args: {
			slug: t.arg({ type: 'String' }),
			type: t.arg({ type: 'String' }),
		},
		resolve: async (_, args, ctx) => {
			const { slug, type } = args

			if (slug && type) {
				return await ctx.db
					.selectFrom('pieces_view')
					.selectAll()
					.where('slug', '=', slug)
					.where('from_piece', '=', type as Pieces)
					.executeTakeFirstOrThrow()
			} else {
				const find = await ctx.db
					.selectFrom('pieces_view')
					.select(ctx.db.fn.count<number>('id').as('count'))
					.executeTakeFirstOrThrow()
				const skip = Math.floor(Math.random() * find.count)

				return await ctx.db
					.selectFrom('pieces_view')
					.selectAll()
					.limit(1)
					.offset(skip)
					.executeTakeFirstOrThrow()
			}
		},
	}),
}))
