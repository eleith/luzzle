import { stringArg, queryField, intArg, nonNull } from 'nexus'

const MAX_TAKE = 500
const MAX_SKIP = 200000

export default queryField((t) => {
  t.list.field('books', {
    type: 'Book',
    args: {
      skip: intArg({ default: 0 }),
      take: nonNull(intArg({ default: 10 })),
      around: stringArg(),
    },
    resolve: async (_parent, args, ctx) => {
      const { take, skip, around } = args

      if (around) {
        const bookMain = await ctx.prisma.book.findUnique({ where: { slug: around } })
        if (bookMain) {
          const bookBefore = await ctx.prisma.book.findMany({
            take: 1,
            skip: 1,
            orderBy: { read_order: 'desc' },
            cursor: { read_order: bookMain.read_order },
          })
          const bookAfter = await ctx.prisma.book.findMany({
            take: -1,
            skip: 1,
            orderBy: { read_order: 'desc' },
            cursor: { read_order: bookMain.read_order },
          })

          return [...bookBefore, bookMain, ...bookAfter]
        }
        return null
      } else {
        return ctx.prisma.book.findMany({
          skip: Math.min(Math.max(skip || 0, 0), MAX_SKIP),
          take: Math.min(take, MAX_TAKE),
          orderBy: { read_order: 'desc' },
        })
      }
    },
  })
})
