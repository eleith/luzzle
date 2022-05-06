import useSWR, { SWRConfiguration, SWRResponse } from 'swr'
import { ResultOf, TypedDocumentNode, VariablesOf } from '@graphql-typed-document-node/core'
import fetch from '@app/lib/graphql/request'
import { DocumentNode } from 'graphql'
import config from '@app/common/config'

const graphEndPoint = `${config.HOST}${config.GRAPHQL_ENDPOINT}`

async function fetcher<X extends DocumentNode>(
  gql: X,
  variables?: VariablesOf<X>
): Promise<ResultOf<X>> {
  return fetch(graphEndPoint, gql, variables)
}

export default function useGraphSWR<
  X extends TypedDocumentNode<ResultOf<X>, VariablesOf<X>>,
  E extends Error
>(
  gql: X | null,
  variables?: VariablesOf<X>,
  options?: SWRConfiguration<ResultOf<X>, E>
): SWRResponse<ResultOf<X>, E> {
  return useSWR<ResultOf<X>, E>(
    [gql, variables],
    fetcher as (gql: X, variables?: VariablesOf<X>) => Promise<ResultOf<X>>,
    options
  )
}
