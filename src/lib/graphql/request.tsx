import { request as graphqlRequest } from 'graphql-request'
import { TypedDocumentNode, ResultOf, VariablesOf } from '@graphql-typed-document-node/core'
import config from '@app/common/config'

const graphEndPoint = `${config.HOST}${config.GRAPHQL_ENDPOINT}`

export default async function request<X extends TypedDocumentNode<ResultOf<X>, VariablesOf<X>>>(
  gql: X,
  variables?: VariablesOf<X>
): Promise<ResultOf<X>> {
  if (variables) {
    return graphqlRequest(graphEndPoint, gql, variables)
  } else {
    return graphqlRequest(graphEndPoint, gql)
  }
}
