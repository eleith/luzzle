import PageFull from '@app/common/components/layout/PageFull'
import gql from '@app/lib/graphql/tag'
import textFragment from '@app/common/graphql/texts/fragments/textFullDetails'
import { GetTextsDocument } from './_gql_/index'
import staticClient from '@app/common/graphql/staticClient'
import { Box, Anchor } from '@luzzle/ui/components'
import useGraphSWRInfinite from '@app/common/hooks/useGraphSWRInfinite'
import { useState } from 'react'
import { ResultOf } from '@graphql-typed-document-node/core'
import * as styles from './index.css'
import Text from 'next/link'
import PieceCard from '@app/common/components/pieces/PieceCard'

const getTextsQuery = gql<typeof GetTextsDocument>(
	`query GetTexts($take: Int, $page: Int) {
  texts(take: $take, page: $page) {
    ...TextFullDetails
  }
}
`,
	textFragment
)

type GetTextsQuery = ResultOf<typeof getTextsQuery>
type Text = NonNullable<GetTextsQuery['texts']>[number]

type TextsProps = {
	texts: Text[]
}

const TAKE = 50

export async function getStaticProps(): Promise<{ props: TextsProps }> {
	const response = await staticClient.query({ query: getTextsQuery, variables: { take: TAKE } })

	return {
		props: {
			texts: response.data?.texts || [],
		},
	}
}

export default function Texts({ texts }: TextsProps): JSX.Element {
	const totalTexts: Text[] = []
	const [shouldFetch, setFetch] = useState(false)
	const { data, size, setSize } = useGraphSWRInfinite(
		(page, previousData: GetTextsQuery | null) => {
			const lastData = previousData?.texts || texts
			if (shouldFetch && lastData.length === TAKE) {
				return {
					gql: getTextsQuery,
					variables: {
						take: TAKE,
						page: page + 1,
					},
				}
			} else {
				return null
			}
		},
		{
			revalidateFirstPage: false,
			revalidateOnFocus: false,
		}
	)

	const lastPage = data?.[data.length - 1]?.texts || []
	const isEnd = size !== 1 && (lastPage.length === 0 || lastPage.length < TAKE)

	if (data) {
		const pages = data.reduce((total, query) => [...total, ...(query.texts || [])], [] as Text[])
		totalTexts.push(...texts, ...pages)
	} else {
		totalTexts.push(...texts)
	}

	function loadMore(): void {
		if (size === 1) {
			setFetch(true)
		}
		setSize(size + 1)
	}

	const allTexts = totalTexts.map((text, i) => (
		<PieceCard
			id={text.id}
			slug={text.slug}
			media={text.representativeImage}
			title={text.title}
			type={'texts'}
			loading={i <= 10 ? 'eager' : 'lazy'}
			key={i}
		/>
	))

	return (
		<PageFull meta={{ title: 'texts' }}>
			<Box>
				<Box className={styles.textsContainer}>{allTexts}</Box>
				{!isEnd && (
					<Box className={styles.textsActions}>
						<Anchor onClick={loadMore}>get more texts</Anchor>
					</Box>
				)}
			</Box>
		</PageFull>
	)
}
