import builder from '@app/lib/graphql/builder'
import PieceObject from '../../piece/objects/piece'
import { sql } from '@luzzle/kysely'

const MAX_RESULTS = 10

builder.queryFields((t) => ({
	search: t.field({
		errors: {
			types: [Error],
		},
		type: [PieceObject],
		args: {
			query: t.arg({ type: 'String', required: true }),
		},
		resolve: async (_, args, ctx) => {
			return ctx.db
				.selectFrom('pieces_fts5')
				.selectAll()
				.limit(MAX_RESULTS)
				.where(sql`pieces_fts5`, sql`match`, args.query)
				.orderBy(sql`bm25(pieces_fts5, 1, 1, 1, 10, 3, 2, 1, 3, 3, 1, 1, 1)`)
				.execute()
		},
	}),
}))
