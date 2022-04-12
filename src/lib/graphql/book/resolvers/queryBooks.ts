import { FieldResolver } from 'nexus'

type BookResolverArgs = Parameters<FieldResolver<'Query', 'books'>>
type BookResolver = Promise<Awaited<ReturnType<FieldResolver<'Query', 'books'>>>>

const MAX_TAKE = 500
const MAX_SKIP = 200000

async function resolve(...[, args, ctx]: BookResolverArgs): BookResolver {
  const { take, skip } = args

  return ctx.prisma.book.findMany({
    skip: Math.min(Math.max(skip || 0, 0), MAX_SKIP),
    take: Math.min(take, MAX_TAKE),
    orderBy: { read_order: 'desc' },
  })
}

export default resolve
