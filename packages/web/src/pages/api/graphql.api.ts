import { ApolloServer } from 'apollo-server-micro'
import schema from '@app/common/graphql/schema'
import { createContext } from '@app/lib/graphql/context'
import {
  ApolloServerPluginLandingPageDisabled,
  ApolloServerPluginLandingPageGraphQLPlayground,
} from 'apollo-server-core'

import type { IncomingMessage, ServerResponse } from 'http'
import appConfig from '@app/common/config'

const playground = appConfig.isDevelopment
  ? ApolloServerPluginLandingPageGraphQLPlayground()
  : ApolloServerPluginLandingPageDisabled()

const apolloServer = new ApolloServer({
  context: createContext,
  schema,
  introspection: appConfig.isDevelopment,
  cache: 'bounded',
  debug: appConfig.isDevelopment,
  plugins: [playground],
})

const startServer = apolloServer.start()

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  await startServer

  await apolloServer.createHandler({
    path: '/api/graphql',
  })(req, res)
}
