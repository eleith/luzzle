import PageFull from '@app/common/components/layout/PageFull'
import linkFragment from '@app/common/graphql/link/fragments/linkFullDetails'
import { GetStaticPathsResult } from 'next'
import NextLink from 'next/link'
import gql from '@app/lib/graphql/tag'
import { GetPartialLinksDocument, GetLinkBySlugDocument } from './_gql_/[slug]'
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
	typeof GetPartialLinksDocument
>(`query GetPartialLinks($take: Int, $page: Int) {
  links(take: $take, page: $page) {
    slug
		dateAccessed
  }
}`)

const linkQuery = gql<typeof GetLinkBySlugDocument>(
	`query GetLinkBySlug($slug: String!) {
  link(slug: $slug) {
    __typename
    ... on Error {
      message
    }
    ... on QueryLinkSuccess {
      data {
        ...LinkFullDetails
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
	linkFragment
)

type Link = ResultSuccessOf<typeof linkQuery, 'link'>
type LinkOrderPartial = ResultOneOf<typeof partialLinksQuery, 'links'>
type LinkPageStaticParams = { params: LinkOrderPartial }
type LinkPageProps = { link: Link }

function makeLinkDateString(link?: Link): string {
	const month =
		link && typeof link.dateAccessed === 'number' ? new Date(link.dateAccessed).getMonth() + 1 : '?'
	const year =
		link && typeof link.dateAccessed === 'number' ? new Date(link.dateAccessed).getFullYear() : '?'

	return `${month} / ${year}`
}

function makeSiblingLink(image: JSX.Element, slug?: string): JSX.Element {
	if (slug) {
		return (
			<NextLink href={`/links/${slug}`} passHref>
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

	const linkPage = (
		<Box>
			<Box>
				<Box className={styles.linkCard}>
					<Box>{makeSiblingLink(<CaretLeft size={45} />, link.siblings?.previous?.slug)}</Box>
					<Box style={{ marginBottom: '-200px' }}>
						<ArticleCoverFor link={link} size={'LARGE'} />
					</Box>
					<Box>{makeSiblingLink(<CaretRight size={45} />, link.siblings?.next?.slug)}</Box>
				</Box>
			</Box>
			<Box>
				<Box className={styles.linkContainer}>
					<Box className={styles.linkDetails}>
						<Box style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
							{link.archiveUrl ? (
								<Anchor href={link.archiveUrl}>
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
						{link.subtitle && (
							<Text as="h2" size="h3">
								{link.subtitle}
							</Text>
						)}
						<Text>
							by {link.author}
							{link.coauthors && `, ${link.coauthors?.split(',').join(', ')}`}
						</Text>
						<br />
						<Divider />
						<br />
						<Text as="h3" size="h3">
							link
						</Text>
						<br />
						<Box>
							<Anchor href={link.url} hoverAction="underline">
								{link.url}
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
		variables: { take, page },
	})
	const links = response.data.links?.filter(Boolean) || []
	const partialLinks = links.map((link) => ({ slug: link.slug, dateAccessed: link.dateAccessed }))

	return partialLinks
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
		variables: { slug: params.slug },
	})
	const response = graphQlresponse.data.link

	if (response?.__typename === 'QueryLinkSuccess') {
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
