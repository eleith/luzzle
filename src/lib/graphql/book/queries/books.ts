import builder from '@app/graphql/builder'
import BookObject from '../objects/book'

const SKIP_DEFAULT = 0
const SKIP_MAX = 100000
const TAKE_DEFAULT = 100
const TAKE_MAX = 500

builder.queryFields((t) => ({
  books: t.field({
    type: [BookObject],
    args: {
      skip: t.arg({ type: 'Int', defaultValue: SKIP_DEFAULT }),
      take: t.arg({ type: 'Int', defaultValue: TAKE_DEFAULT }),
    },
    resolve: async (_, args, ctx) => {
      const { take, skip } = args

      return ctx.prisma.book.findMany({
        skip: Math.min(Math.max(skip || SKIP_DEFAULT, SKIP_DEFAULT), SKIP_MAX),
        take: Math.min(Math.max(take || TAKE_DEFAULT, TAKE_DEFAULT), TAKE_MAX),
        orderBy: { read_order: 'desc' },
      })
    },
  }),
}))
