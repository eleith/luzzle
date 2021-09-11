import { request } from 'graphql-request'
import useSWR, { SWRResponse } from 'swr'
import { TypedDocumentNode } from '@graphql-typed-document-node/core'
import { print } from 'graphql'
import config from '@app/common/config'

export default function useSWRequest<T, E>(gql: TypedDocumentNode): SWRResponse<T, E> {
  const fetcher = (query: TypedDocumentNode): Promise<T> => request(config.GRAPHQL_ENDPOINT, query)
  return useSWR<T>(print(gql), fetcher)
}
