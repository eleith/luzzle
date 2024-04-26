import useSWR, { SWRConfiguration, SWRResponse } from 'swr'
import { ResultOf, TypedDocumentNode, VariablesOf } from '@graphql-typed-document-node/core'
import fetch from '@app/common/graphql/fetch'

export default function useGraphSWR<
	X extends TypedDocumentNode<ResultOf<X>, VariablesOf<X>>,
	E extends Error,
>(
	gql: X | null,
	variables?: VariablesOf<X>,
	options?: SWRConfiguration<ResultOf<X>, E>
): SWRResponse<ResultOf<X>, E> {
	return useSWR<ResultOf<X>, E>(
		[gql, variables],
		fetch as (gql: X, variables?: VariablesOf<X>) => Promise<ResultOf<X>>,
		options
	)
}
