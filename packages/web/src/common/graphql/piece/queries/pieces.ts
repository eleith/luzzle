import builder from '@app/lib/graphql/builder'
import PieceObject from '../objects/piece'

const TAKE_DEFAULT = 100
const TAKE_MAX = 500

builder.queryFields((t) => ({
	pieces: t.field({
		type: [PieceObject],
		args: {
			take: t.arg({ type: 'Int', defaultValue: TAKE_DEFAULT }),
			page: t.arg({ type: 'Int' }),
			tag: t.arg({ type: 'String' }),
			type: t.arg({ type: 'String', validate: (x) => /links|books/.test(x) }),
		},
		resolve: async (_, args, ctx) => {
			const { take, page, tag } = args
			const type = args.type as 'links' | 'books' | undefined
			const takeValidated = Math.min(take && take > 0 ? take : TAKE_DEFAULT, TAKE_MAX)

			if (tag) {
				const oneTag = await ctx.db
					.selectFrom('tags')
					.selectAll()
					.where('slug', '=', tag)
					.executeTakeFirstOrThrow()

				if (oneTag) {
					const tagMap = await ctx.db
						.selectFrom('tag_maps')
						.selectAll()
						.where('id_tag', '=', oneTag.id)
						.execute()

					let query = ctx.db
						.selectFrom('pieces_view')
						.selectAll()
						.where(
							'id',
							'in',
							tagMap.map((x) => x.id_item)
						)
						.limit(takeValidated)

					if (page) {
						query = query.offset(takeValidated * page)
					}

					if (type) {
						query = query.where('from_piece', '=', type)
					}

					return query.execute()
				}
			}

			let query = ctx.db.selectFrom('pieces_view').selectAll()

			if (page) {
				query = query.offset(takeValidated * page)
			}

			if (type) {
				query = query.where('from_piece', '=', type)
			}

			return query
				.orderBy('date_order', 'desc')
				.orderBy('slug', 'asc')
				.limit(takeValidated)
				.execute()
		},
	}),
}))
