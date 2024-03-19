import builder from '@app/lib/graphql/builder'
import { Pieces, Piece } from '@luzzle/core'
import PieceObject from '../objects/piece'

const PieceTypeRegExp = new RegExp(Object.values(Piece).join('|'))

builder.queryFields((t) => ({
	piece: t.field({
		errors: {
			types: [Error],
		},
		type: PieceObject,
		args: {
			slug: t.arg({ type: 'String' }),
			type: t.arg({ type: 'String', validate: (x) => PieceTypeRegExp.test(x) }),
		},
		resolve: async (_, args, ctx) => {
			const { slug, type } = args

			if (slug && type) {
				return await ctx.db
					.selectFrom('pieces')
					.selectAll()
					.where('slug', '=', slug)
					.where('type', '=', type as Pieces)
					.executeTakeFirstOrThrow()
			} else {
				const find = await ctx.db
					.selectFrom('pieces')
					.select(ctx.db.fn.count<number>('id').as('count'))
					.executeTakeFirstOrThrow()
				const skip = Math.floor(Math.random() * find.count)

				return await ctx.db
					.selectFrom('pieces')
					.selectAll()
					.limit(1)
					.offset(skip)
					.executeTakeFirstOrThrow()
			}
		},
	}),
}))
