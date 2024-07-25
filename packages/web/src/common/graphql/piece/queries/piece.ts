import builder from '@app/lib/graphql/builder'
import PieceObject, { WebPieceTypesRegExp, WebPieces } from '../objects/piece'

builder.queryFields((t) => ({
	piece: t.field({
		errors: {
			types: [Error],
		},
		type: PieceObject,
		args: {
			slug: t.arg({ type: 'String' }),
			type: t.arg({ type: 'String', validate: (x) => WebPieceTypesRegExp.test(x) }),
		},
		resolve: async (_, args, ctx) => {
			const { slug, type } = args

			if (slug && type) {
				return await ctx.db
					.selectFrom('web_pieces')
					.selectAll()
					.where('slug', '=', slug)
					.where('type', '=', type as WebPieces['type'])
					.executeTakeFirstOrThrow()
			} else {
				const find = await ctx.db
					.selectFrom('web_pieces')
					.select(ctx.db.fn.count<number>('id').as('count'))
					.executeTakeFirstOrThrow()
				const skip = Math.floor(Math.random() * find.count)

				return await ctx.db
					.selectFrom('web_pieces')
					.selectAll()
					.limit(1)
					.offset(skip)
					.executeTakeFirstOrThrow()
			}
		},
	}),
}))
