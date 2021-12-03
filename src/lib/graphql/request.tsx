import { request as graphqlRequest } from 'graphql-request'
import { TypedDocumentNode, ResultOf } from '@graphql-typed-document-node/core'
import config from '@app/common/config'

type Variables = { [key: string]: string }

const localGraphEndpoint = `${config.HOST}${config.GRAPHQL_ENDPOINT}`

export default async function request<X extends TypedDocumentNode, V = Variables>(
  gql: X,
  variables?: V
): Promise<ResultOf<X>> {
  if (variables) {
    return await graphqlRequest<ResultOf<X>, V>(localGraphEndpoint, gql, variables)
  } else {
    return await graphqlRequest<ResultOf<X>>(localGraphEndpoint, gql)
  }
}
