import PageFull from '@app/common/components/layout/PageFull'
import pieceFragment from '@app/common/graphql/piece/fragments/pieceFullDetails'
import { GetStaticPathsResult } from 'next'
import NextLink from 'next/link'
import gql from '@app/lib/graphql/tag'
import { GetPartialTextPiecesDocument, GetTextPieceBySlugDocument } from './_gql_/[slug]'
import staticClient from '@app/common/graphql/staticClient'
import { Box, Text, Anchor, Button } from '@luzzle/ui/components'
import * as styles from './[slug].css'
import { CaretLeft, CaretRight } from 'phosphor-react'
import DiscussionForm from '@app/common/components/discussions/DiscussionForm'
import { useState } from 'react'
import { ResultOneOf, ResultSuccessOf } from '@app/@types/utilities'
import config from '@app/common/config'
import ArticleCoverFor from '@app/common/components/links/ArticleCoverFor'
import Markdown from 'react-markdown'

const partialTextsQuery = gql<
	typeof GetPartialTextPiecesDocument
>(`query GetPartialTextPieces($take: Int, $page: Int, $type: String) {
  pieces(take: $take, page: $page, type: $type) {
    slug
		dateOrder
  }
}`)

const textQuery = gql<typeof GetTextPieceBySlugDocument>(
	`query GetTextPieceBySlug($slug: String!, $type: String) {
  piece(slug: $slug, type: $type) {
    __typename
    ... on Error {
      message
    }
    ... on QueryPieceSuccess {
      data {
        ...PieceFullDetails
				metadata
        tags {
          name
          slug
        }
        siblings {
          previous {
            slug
          }
          next {
            slug
          }
        }
      }
    }
  }
}`,
	pieceFragment
)

type TextPiece = ResultSuccessOf<typeof textQuery, 'piece'>
type TextOrderPartial = ResultOneOf<typeof partialTextsQuery, 'pieces'>
type TextPageStaticParams = { params: TextOrderPartial }
type TextPageProps = { text: TextPiece }
type TextMetadata = { subtitle: string }

function makeSiblingLink(image: JSX.Element, slug?: string): JSX.Element {
	if (slug) {
		return (
			<NextLink href={`/pieces/texts/${slug}`} passHref>
				<Anchor color={'inherit'} className={styles.navigation}>
					{image}
				</Anchor>
			</NextLink>
		)
	}

	return <Anchor disabled>{image}</Anchor>
}

export default function TextPage({ text }: TextPageProps): JSX.Element {
	const [showForm, setShowForm] = useState(false)

	const discussionForm = (
		<DiscussionForm type="texts" slug={text.slug} onClose={() => setShowForm(false)} />
	)
	const metadata: TextMetadata = text.metadata ? JSON.parse(text.metadata) : {}

	const textPage = (
		<Box>
			<Box>
				<Box className={styles.textCard}>
					<Box>{makeSiblingLink(<CaretLeft size={45} />, text.siblings?.previous?.slug)}</Box>
					<Box style={{ marginBottom: '-200px' }}>
						<ArticleCoverFor piece={text} hasMedia={!!text.media} size={'LARGE'} />
					</Box>
					<Box>{makeSiblingLink(<CaretRight size={45} />, text.siblings?.next?.slug)}</Box>
				</Box>
			</Box>
			<Box>
				<Box className={styles.textContainer}>
					<Box className={styles.textDetails}>
						<Box style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
							<Button
								onClick={() => setShowForm(true)}
								raised
								use={'primary'}
								className={styles.textDiscuss}
							>
								discuss
							</Button>
						</Box>
						<Text as="h1" size="title">
							{text.title}
						</Text>
						{metadata.subtitle && (
							<Text as="h2" size="h3">
								{metadata.subtitle}
							</Text>
						)}
						{text.dateOrder && (
							<Text size="caption">
								published on {new Date(text.dateOrder).toLocaleDateString()}
							</Text>
						)}
						<br />
						<Box>
							<Markdown>{text.note || '---'}</Markdown>
						</Box>
						<br />
						<br />
						<Text size="caption">
							{!!text.tags?.length && <span>tags - </span>}
							{text.tags?.map((tag) => (
								<span key={tag.slug}>
									<NextLink href={`/tags/${tag.slug}`} passHref>
										<Anchor hoverAction="underline">{tag.name}</Anchor>
									</NextLink>{' '}
								</span>
							))}
						</Text>
						<br />
						<br />
					</Box>
				</Box>
			</Box>
		</Box>
	)

	return (
		<PageFull
			meta={{
				title: text.title,
				image: `${config.public.HOST_STATIC}/images/og/texts/${text.slug}.png`,
				description: text.summary || '',
			}}
			invert
		>
			{showForm ? discussionForm : textPage}
		</PageFull>
	)
}

async function getTextsForPage(take: number, page?: number): Promise<TextOrderPartial[]> {
	const response = await staticClient.query({
		query: partialTextsQuery,
		variables: { take, page, type: 'texts' },
	})
	const texts = response.data.pieces?.filter(Boolean) || []
	const partialLinks = texts.map((text) => ({ slug: text.slug, dateOrder: text.dateOrder }))

	return partialLinks
}

async function getAllLinkSlugs(): Promise<string[]> {
	const take = 100
	const slugs: string[] = []

	let partialText = await getTextsForPage(take)
	let page = 0
	slugs.push(...partialText.map((text) => text.slug))

	while (partialText.length === take) {
		partialText = await getTextsForPage(take, page)
		slugs.push(...partialText.map((text) => text.slug))
		page += 1
	}

	return slugs
}

export async function getStaticPaths(): Promise<GetStaticPathsResult> {
	const slugs = await getAllLinkSlugs()

	return {
		paths: slugs.map((slug) => ({
			params: {
				slug,
			},
		})),
		fallback: 'blocking',
	}
}

export async function getStaticProps({
	params,
}: TextPageStaticParams): Promise<{ props: TextPageProps } | { notFound: true }> {
	const graphQlresponse = await staticClient.query({
		query: textQuery,
		variables: { slug: params.slug, type: 'texts' },
	})
	const response = graphQlresponse.data.piece

	if (response?.__typename === 'QueryPieceSuccess') {
		return {
			props: {
				text: response.data,
			},
		}
	} else {
		return {
			notFound: true,
		}
	}
}
