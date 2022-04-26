import useSWRInfinite, { SWRInfiniteResponse, SWRInfiniteConfiguration } from 'swr/infinite'
import { ResultOf, VariablesOf } from '@graphql-typed-document-node/core'
import { DocumentNode } from 'graphql'
import fetch from '@app/graphql/request'
import config from '@app/common/config'

const graphEndPoint = `${config.HOST}${config.GRAPHQL_ENDPOINT}`

type SWRInfiniteGetKey<X> = (
  index: number,
  previousData: ResultOf<X> | null
) => { gql: X; variables?: VariablesOf<X> } | null

async function fetcher<X extends DocumentNode>(
  gql: X,
  variables?: VariablesOf<X>
): Promise<ResultOf<X>> {
  return fetch(graphEndPoint, gql, variables)
}

export default function useGraphSWRInfinite<X extends DocumentNode, E extends Error>(
  getGraph: SWRInfiniteGetKey<X>,
  options?: SWRInfiniteConfiguration<ResultOf<X>, E>
): SWRInfiniteResponse<ResultOf<X>, E> {
  const getKey = (i: number, p: ResultOf<X>): X | [X, VariablesOf<X>] | null => {
    const graph = getGraph(i, p)

    if (graph) {
      if (graph.variables) {
        return [graph.gql, graph.variables]
      }
      return graph.gql
    } else {
      return null
    }
  }
  return useSWRInfinite<ResultOf<X>, E>(
    getKey,
    fetcher as (gql: X, variables?: VariablesOf<X>) => Promise<ResultOf<X>>,
    options
  )
}
