import { request as graphqlRequest } from 'graphql-request'
import { TypedDocumentNode, ResultOf, VariablesOf } from '@graphql-typed-document-node/core'

export default async function request<X extends TypedDocumentNode<ResultOf<X>, VariablesOf<X>>>(
  endPoint: string,
  gql: X,
  variables?: VariablesOf<X>
): Promise<ResultOf<X>> {
  if (variables) {
    return graphqlRequest(endPoint, gql, variables)
  } else {
    return graphqlRequest(endPoint, gql)
  }
}
