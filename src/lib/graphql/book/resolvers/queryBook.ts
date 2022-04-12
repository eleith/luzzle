import { FieldResolver } from 'nexus'

type BookResolverArgs = Parameters<FieldResolver<'Query', 'book'>>
type BookResolver = Promise<Awaited<ReturnType<FieldResolver<'Query', 'book'>>>>

async function resolve(...[, args, ctx]: BookResolverArgs): BookResolver {
  const { slug, id } = args

  if (slug) {
    return await ctx.prisma.book.findUnique({ where: { slug } })
  } else if (id) {
    return await ctx.prisma.book.findUnique({ where: { id: id } })
  } else {
    const count = await ctx.prisma.book.count()
    const skip = Math.floor(Math.random() * count)
    const books = await ctx.prisma.book.findMany({ take: 1, skip })
    return books[0]
  }
}

export default resolve
