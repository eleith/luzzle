import PageFull from '@app/common/components/layout/PageFull'
import pieceFragment from '@app/common/graphql/piece/fragments/pieceFullDetails'
import { GetStaticPathsResult } from 'next'
import NextLink from 'next/link'
import gql from '@app/lib/graphql/tag'
import { GetPartialLinkPiecesDocument, GetLinkPieceBySlugDocument } from './_gql_/[slug]'
import staticClient from '@app/common/graphql/staticClient'
import { Box, Text, Anchor, Button, Divider } from '@luzzle/ui/components'
import * as styles from './[slug].css'
import { CaretLeft, CaretRight, LinkSimple } from 'phosphor-react'
import DiscussionForm from '@app/common/components/discussions/DiscussionForm'
import { useState } from 'react'
import { ResultOneOf, ResultSuccessOf } from '@app/@types/utilities'
import config from '@app/common/config'
import ArticleCoverFor from '@app/common/components/links/ArticleCoverFor'

const partialLinksQuery = gql<
	typeof GetPartialLinkPiecesDocument
>(`query GetPartialLinkPieces($take: Int, $page: Int, $type: String) {
  pieces(take: $take, page: $page, type: $type) {
    slug
		dateOrder
  }
}`)

const linkQuery = gql<typeof GetLinkPieceBySlugDocument>(
	`query GetLinkPieceBySlug($slug: String!, $type: String) {
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

type Link = ResultSuccessOf<typeof linkQuery, 'piece'>
type LinkOrderPartial = ResultOneOf<typeof partialLinksQuery, 'pieces'>
type LinkPageStaticParams = { params: LinkOrderPartial }
type LinkPageProps = { link: Link }
type LinkMetadata = {
	url: string
	archiveUrl: string
	subtitle: string
	author: string
	coauthors: string
}

function makeLinkDateString(link?: Link): string {
	const month =
		link && typeof link.dateOrder === 'number' ? new Date(link.dateOrder).getMonth() + 1 : '?'
	const year =
		link && typeof link.dateOrder === 'number' ? new Date(link.dateOrder).getFullYear() : '?'

	return `${month} / ${year}`
}

function makeSiblingLink(image: JSX.Element, slug?: string): JSX.Element {
	if (slug) {
		return (
			<NextLink href={`/pieces/links/${slug}`} passHref>
				<Anchor color={'inherit'} className={styles.navigation}>
					{image}
				</Anchor>
			</NextLink>
		)
	}

	return <Anchor disabled>{image}</Anchor>
}

export default function LinkPage({ link }: LinkPageProps): JSX.Element {
	const [showForm, setShowForm] = useState(false)

	const discussionForm = (
		<DiscussionForm type="links" slug={link.slug} onClose={() => setShowForm(false)} />
	)
	const metadata: LinkMetadata = link.metadata ? JSON.parse(link.metadata) : {}

	const linkPage = (
		<Box>
			<Box>
				<Box className={styles.linkCard}>
					<Box>{makeSiblingLink(<CaretLeft size={45} />, link.siblings?.previous?.slug)}</Box>
					<Box style={{ marginBottom: '-200px' }}>
						<ArticleCoverFor
							piece={{
								title: link.title,
								media: link.media,
								slug: link.slug,
								id: link.id,
							}}
							hasMedia={!!link.media}
							size={'LARGE'}
						/>
					</Box>
					<Box>{makeSiblingLink(<CaretRight size={45} />, link.siblings?.next?.slug)}</Box>
				</Box>
			</Box>
			<Box>
				<Box className={styles.linkContainer}>
					<Box className={styles.linkDetails}>
						<Box style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
							{metadata.archiveUrl ? (
								<Anchor href={metadata.archiveUrl}>
									<Button minimal use={'primary'} className={styles.linkDiscuss}>
										<LinkSimple size={36} />
									</Button>
								</Anchor>
							) : (
								<Box />
							)}

							<Button
								onClick={() => setShowForm(true)}
								raised
								use={'primary'}
								className={styles.linkDiscuss}
							>
								discuss
							</Button>
						</Box>
						<Text as="h1" size="title">
							{link.title}
						</Text>
						{metadata.subtitle && (
							<Text as="h2" size="h3">
								{metadata.subtitle}
							</Text>
						)}
						<Text>
							by {metadata.author}
							{metadata.coauthors && `, ${metadata.coauthors?.split(',').join(', ')}`}
						</Text>
						<br />
						<Divider />
						<br />
						<Text as="h3" size="h3">
							link
						</Text>
						<br />
						<Box>
							<Anchor href={metadata.url} hoverAction="underline">
								{metadata.url}
							</Anchor>
						</Box>
						<br />
						<Divider />
						<br />
						<Text as="h3" size="h3">
							notes
						</Text>
						<br />
						<Box>
							<Text className={styles.linkNote}>
								{(link.note || '---').split('\n\n').map((p, i) => (
									<p key={i}>{p}</p>
								))}
							</Text>
						</Box>
						<br />
						<br />
						<Box>
							<Text>read on {makeLinkDateString(link)}</Text>
						</Box>
						<br />
						<Divider />
						<br />
						<Text as="h3" size="h3">
							about
						</Text>
						<br />
						<Box>
							<Text className={styles.linkNote}>
								{(link.summary || '---').split('\n').map((p, i) => (
									<p key={i}>{p}</p>
								))}
							</Text>
						</Box>
						<br />
						<Text size="caption">
							<span>tags - </span>
							{link.tags?.map((tag) => (
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
				title: link.title,
				image: `${config.public.HOST_STATIC}/images/og/links/${link.slug}.png`,
				description: link.note || link.summary || '',
			}}
			invert
		>
			{showForm ? discussionForm : linkPage}
		</PageFull>
	)
}

async function getLinksForPage(take: number, page?: number): Promise<LinkOrderPartial[]> {
	const response = await staticClient.query({
		query: partialLinksQuery,
		variables: { take, page, type: 'links' },
	})
	const links = response.data.pieces?.filter(Boolean) || []
	return links.map((link) => ({ slug: link.slug, dateOrder: link.dateOrder }))
}

async function getAllLinkSlugs(): Promise<string[]> {
	const take = 100
	const slugs: string[] = []

	let partialLinks = await getLinksForPage(take)
	let page = 0

	slugs.push(...partialLinks.map((link) => link.slug))

	while (partialLinks.length === take) {
		partialLinks = await getLinksForPage(take, page)
		slugs.push(...partialLinks.map((link) => link.slug))
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
}: LinkPageStaticParams): Promise<{ props: LinkPageProps } | { notFound: true }> {
	const graphQlresponse = await staticClient.query({
		query: linkQuery,
		variables: { slug: params.slug, type: 'links' },
	})
	const response = graphQlresponse.data.piece

	if (response?.__typename === 'QueryPieceSuccess') {
		return {
			props: {
				link: response.data,
			},
		}
	} else {
		return {
			notFound: true,
		}
	}
}
