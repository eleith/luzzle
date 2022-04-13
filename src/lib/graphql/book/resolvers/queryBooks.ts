import { ResolverArgsFor, ResolverFor } from '@app/graphql/types'

export const SKIP_DEFAULT = 0
export const SKIP_MAX = 100000
export const TAKE_DEFAULT = 100
export const TAKE_MAX = 500

async function resolve(...[, args, ctx]: ResolverArgsFor<'Query', 'books'>): ResolverFor<'Query', 'books'> {
  const { take, skip } = args

  return ctx.prisma.book.findMany({
    skip: Math.min(Math.max(skip || SKIP_DEFAULT, SKIP_DEFAULT), SKIP_MAX),
    take: Math.min(Math.max(take || TAKE_DEFAULT, TAKE_DEFAULT), TAKE_MAX),
    orderBy: { read_order: 'desc' },
  })
}

export default resolve
