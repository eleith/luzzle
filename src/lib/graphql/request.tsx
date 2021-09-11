import { request as graphqlRequest } from 'graphql-request'
import { TypedDocumentNode } from '@graphql-typed-document-node/core'
import config from '@app/common/config'

export default async function request<T>(gql: TypedDocumentNode): Promise<T> {
  return await graphqlRequest<T>(`${config.HOST}${config.GRAPHQL_ENDPOINT}`, gql)
}
