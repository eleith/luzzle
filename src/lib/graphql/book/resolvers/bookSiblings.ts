import { ResolverArgsFor, ResolverFor } from '@app/graphql/types'

async function resolve(
  ...[parent, , ctx]: ResolverArgsFor<'Book', 'siblings'>
): ResolverFor<'Book', 'siblings'> {
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
