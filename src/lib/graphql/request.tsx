import { request as graphqlRequest } from 'graphql-request'
import { TypedDocumentNode, ResultOf } from '@graphql-typed-document-node/core'
import config from '@app/common/config'

type Variables = { [key: string]: string }

const localUrl = `${config.HOST}${config.GRAPHQL_ENDPOINT}`

type ArrayElementType<T> = T extends (infer R)[] ? R : T
export type ExtractResultFieldTypeFor<T, K extends keyof ResultOf<T>> = NonNullable<
  ResultOf<T>[K]
> extends Array<ArrayElementType<ResultOf<T>[K]>>
  ? NonNullable<ArrayElementType<NonNullable<ResultOf<T>[K]>>>
  : NonNullable<ResultOf<T>[K]>

export default async function request<X extends TypedDocumentNode, V = Variables>(
  gql: X,
  variables?: V
): Promise<ResultOf<X>> {
  if (variables) {
    return await graphqlRequest<ResultOf<X>, V>(localUrl, gql, variables)
  } else {
    return await graphqlRequest<ResultOf<X>>(localUrl, gql)
  }
}
