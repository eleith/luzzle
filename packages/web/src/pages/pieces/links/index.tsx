import PageFull from '@app/common/components/layout/PageFull'
import gql from '@app/lib/graphql/tag'
import linkFragment from '@app/common/graphql/link/fragments/linkFullDetails'
import { GetLinksDocument } from './_gql_/index'
import staticClient from '@app/common/graphql/staticClient'
import { Box, Anchor } from '@luzzle/ui/components'
import useGraphSWRInfinite from '@app/common/hooks/useGraphSWRInfinite'
import { useState } from 'react'
import { ResultOf } from '@graphql-typed-document-node/core'
import * as styles from './index.css'
import Link from 'next/link'
import PieceCard from '@app/common/components/pieces/PieceCard'

const getLinksQuery = gql<typeof GetLinksDocument>(
	`query GetLinks($take: Int, $page: Int) {
  links(take: $take, page: $page) {
    ...LinkFullDetails
  }
}
`,
	linkFragment
)

type GetLinksQuery = ResultOf<typeof getLinksQuery>
type Link = NonNullable<GetLinksQuery['links']>[number]

type LinksProps = {
	links: Link[]
}

const TAKE = 50

export async function getStaticProps(): Promise<{ props: LinksProps }> {
	const response = await staticClient.query({ query: getLinksQuery, variables: { take: TAKE } })

	return {
		props: {
			links: response.data?.links || [],
		},
	}
}

export default function Links({ links }: LinksProps): JSX.Element {
	const totalLinks: Link[] = []
	const [shouldFetch, setFetch] = useState(false)
	const { data, size, setSize } = useGraphSWRInfinite(
		(page, previousData: GetLinksQuery | null) => {
			const lastData = previousData?.links || links
			if (shouldFetch && lastData.length === TAKE) {
				return {
					gql: getLinksQuery,
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

	const lastPage = data?.[data.length - 1]?.links || []
	const isEnd = size !== 1 && (lastPage.length === 0 || lastPage.length < TAKE)

	if (data) {
		const pages = data.reduce((total, query) => [...total, ...(query.links || [])], [] as Link[])
		totalLinks.push(...links, ...pages)
	} else {
		totalLinks.push(...links)
	}

	function loadMore(): void {
		if (size === 1) {
			setFetch(true)
		}
		setSize(size + 1)
	}

	const allLinks = totalLinks.map((link, i) =>
		PieceCard(
			{
				id: link.id,
				slug: link.slug,
				media: link.representativeImage,
				title: link.title,
				type: 'links',
			},
			i
		)
	)

	return (
		<PageFull meta={{ title: 'links' }}>
			<Box>
				<Box className={styles.linksContainer}>{allLinks}</Box>
				{!isEnd && (
					<Box className={styles.linksActions}>
						<Anchor onClick={loadMore}>get more links</Anchor>
					</Box>
				)}
			</Box>
		</PageFull>
	)
}
