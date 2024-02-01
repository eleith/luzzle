import builder from '@app/lib/graphql/builder'
import LinkObject from '../objects/link'

const TAKE_DEFAULT = 100
const TAKE_MAX = 500

builder.queryFields((t) => ({
	links: t.field({
		type: [LinkObject],
		args: {
			take: t.arg({ type: 'Int', defaultValue: TAKE_DEFAULT }),
			page: t.arg({ type: 'Int' }),
			tag: t.arg({ type: 'String' }),
		},
		resolve: async (_, args, ctx) => {
			const { take, page, tag } = args
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

					if (page) {
						return ctx.db
							.selectFrom('links')
							.selectAll()
							.where(
								'id',
								'in',
								tagMap.map((x) => x.id_item)
							)
							.orderBy('date_accessed', 'desc')
							.orderBy('slug', 'asc')
							.limit(takeValidated)
							.offset(takeValidated * page)
							.execute()
					} else {
						return ctx.db
							.selectFrom('links')
							.selectAll()
							.where(
								'id',
								'in',
								tagMap.map((x) => x.id_item)
							)
							.execute()
					}
				}
			}

			if (page) {
				return ctx.db
					.selectFrom('links')
					.selectAll()
					.orderBy('date_accessed', 'desc')
					.orderBy('slug', 'asc')
					.limit(takeValidated)
					.offset(takeValidated * page)
					.execute()
			} else {
				return ctx.db
					.selectFrom('links')
					.selectAll()
					.orderBy('date_accessed', 'desc')
					.orderBy('slug', 'asc')
					.limit(takeValidated)
					.execute()
			}
		},
	}),
}))
