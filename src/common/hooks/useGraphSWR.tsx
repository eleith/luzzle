import { request } from 'graphql-request'
import useSWR, { SWRConfiguration, SWRResponse } from 'swr'
import { ResultOf, VariablesOf } from '@graphql-typed-document-node/core'
import config from '@app/common/config'
import { DocumentNode } from 'graphql'

export default function useGraphSWR<X extends DocumentNode, E extends Error>(
  gql: X,
  variables?: VariablesOf<X>,
  options?: SWRConfiguration<ResultOf<X>, E>
): SWRResponse<ResultOf<X>, E> {
  return useSWR<ResultOf<X>, E>([config.GRAPHQL_ENDPOINT, gql, variables], request, options)
}
