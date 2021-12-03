import { request } from 'graphql-request'
import useSWR, { SWRResponse } from 'swr'
import { TypedDocumentNode, ResultOf } from '@graphql-typed-document-node/core'
import config from '@app/common/config'

type Variables = { [key: string]: string }

export default function useGraphSWR<X extends TypedDocumentNode, V extends Variables, E>(
  gql: X,
  variables?: V
): SWRResponse<ResultOf<X>, E> {
  return useSWR<ResultOf<X>, E>([config.GRAPHQL_ENDPOINT, gql, variables], request)
}
