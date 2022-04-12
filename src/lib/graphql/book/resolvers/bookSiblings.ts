import { FieldResolver } from 'nexus'

type SiblingsResolverArgs = Parameters<FieldResolver<'Book', 'siblings'>>
type SiblingsResolver = Promise<Awaited<ReturnType<FieldResolver<'Book', 'siblings'>>>>

async function resolve(...[parent, , ctx]: SiblingsResolverArgs): SiblingsResolver {
  const before = await ctx.prisma.book.findMany({
    take: 1,
    skip: 1,
    orderBy: { read_order: 'desc' },
    cursor: { read_order: parent.read_order },
  })
  const after = await ctx.prisma.book.findMany({
    take: -1,
    skip: 1,
    orderBy: { read_order: 'desc' },
    cursor: { read_order: parent.read_order },
  })

  const previous = before[0]
  const next = after[0]

  return {
    previous,
    next,
  }
}

export default resolve
