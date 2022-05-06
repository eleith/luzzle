import builder from '@app/lib/graphql/builder'
import BookObject from '../objects/book'

builder.queryFields((t) => ({
  book: t.field({
    type: BookObject,
    args: {
      id: t.arg({ type: 'String' }),
      slug: t.arg({ type: 'String' }),
    },
    resolve: async (_, args, ctx) => {
      const { slug, id } = args

      if (slug) {
        return await ctx.prisma.book.findUnique({ rejectOnNotFound: true, where: { slug } })
      } else if (id) {
        return await ctx.prisma.book.findUnique({ rejectOnNotFound: true, where: { id: id } })
      } else {
        const count = await ctx.prisma.book.count()
        const skip = Math.floor(Math.random() * count)
        const books = await ctx.prisma.book.findMany({ take: 1, skip })
        return books[0]
      }
    },
  }),
}))
