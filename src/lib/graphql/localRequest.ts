import { ApolloClient, InMemoryCache, NormalizedCacheObject } from '@apollo/client'
import { SchemaLink } from '@apollo/client/link/schema'
import { schema } from '@app/lib/graphql/schema'
import { createContext } from '@app/lib/graphql/context'
import { ResultOf } from '@graphql-typed-document-node/core'

type ArrayElementType<T> = T extends (infer R)[] ? R : T
export type ExtractResultFieldTypeFor<T, K extends keyof ResultOf<T>> = NonNullable<
  ResultOf<T>[K]
> extends Array<ArrayElementType<ResultOf<T>[K]>>
  ? NonNullable<ArrayElementType<NonNullable<ResultOf<T>[K]>>>
  : NonNullable<ResultOf<T>[K]>

function createStaticApolloClient(): ApolloClient<NormalizedCacheObject> {
  return new ApolloClient({
    ssrMode: true,
    link: new SchemaLink({ schema, context: createContext }),
    cache: new InMemoryCache(),
  })
}

export default createStaticApolloClient
