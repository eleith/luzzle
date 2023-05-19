import builder from '@app/lib/graphql/builder'
import BookObject from '../objects/book'

const TAKE_DEFAULT = 100
const TAKE_MAX = 500

builder.queryFields((t) => ({
  books: t.field({
    type: [BookObject],
    args: {
      take: t.arg({ type: 'Int', defaultValue: TAKE_DEFAULT }),
      after: t.arg({ type: 'String' }),
      tag: t.arg({ type: 'String' }),
    },
    resolve: async (_, args, ctx) => {
      const { take, after, tag } = args
      const takeValidated = Math.min(take && take > 0 ? take : TAKE_DEFAULT, TAKE_MAX)

      if (tag) {
        const oneTag = await ctx.prisma.tag.findUnique({
          where: { slug: tag },
        })

        if (oneTag) {
          const tagMap = await ctx.prisma.tagMap.findMany({
            where: { id_tag: oneTag.id },
          })

          if (after) {
            return ctx.prisma.book.findMany({
              skip: 1,
              take: takeValidated,
              where: {
                id: { in: tagMap.map((x) => x.id_item) },
              },
              cursor: { id: after },
            })
          } else {
            return ctx.prisma.book.findMany({
              take: takeValidated,
              where: {
                id: { in: tagMap.map((x) => x.id_item) },
              },
            })
          }
        }
      }

      if (after) {
        return ctx.prisma.book.findMany({
          skip: 1,
          take: takeValidated,
          orderBy: { read_order: 'desc' },
          cursor: { read_order: after },
        })
      } else {
        return ctx.prisma.book.findMany({
          take: takeValidated,
          orderBy: { read_order: 'desc' },
        })
      }
    },
  }),
}))
