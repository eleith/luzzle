import { ResultOf, VariablesOf } from '@graphql-typed-document-node/core'
import fetch from '@app/lib/graphql/request'
import { DocumentNode } from 'graphql'
import config from '@app/common/config'

const graphEndPoint = `${config.public.HOST}${config.public.GRAPHQL_ENDPOINT}`

export default async function fetcher<X extends DocumentNode>(
  gql: X,
  variables?: VariablesOf<X>
): Promise<ResultOf<X>> {
  return fetch(graphEndPoint, gql, variables)
}
