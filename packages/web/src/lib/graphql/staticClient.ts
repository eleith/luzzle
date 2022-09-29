import { ApolloClient, InMemoryCache, NormalizedCacheObject } from '@apollo/client'
import { SchemaLink } from '@apollo/client/link/schema'
import { createContext } from '@app/lib/graphql/context'
import { GraphQLSchema } from 'graphql'

function createStaticApolloClient(schema: GraphQLSchema): ApolloClient<NormalizedCacheObject> {
  return new ApolloClient({
    ssrMode: true,
    link: new SchemaLink({ schema, context: createContext }),
    cache: new InMemoryCache(),
  })
}

export default createStaticApolloClient
