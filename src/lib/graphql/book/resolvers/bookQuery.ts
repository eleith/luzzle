import { stringArg, queryField } from 'nexus'

export default queryField((t) => {
  t.field('book', {
    type: 'Book',
    args: {
      id: stringArg(),
      slug: stringArg(),
    },
    resolve: async (_parent, args, ctx) => {
      const { slug, id } = args

      if (slug) {
        return ctx.prisma.book.findUnique({ where: { slug } })
      } else if (id) {
        return ctx.prisma.book.findUnique({ where: { id: id } })
      } else {
        const count = await ctx.prisma.book.count()
        const skip = Math.floor(Math.random() * count)
        const books = await ctx.prisma.book.findMany({ take: 1, skip })
        return books[0]
      }
    },
  })
})
