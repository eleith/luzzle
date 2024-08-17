import PageFull from '@app/common/components/layout/PageFull'
import pieceFragment from '@app/common/graphql/piece/fragments/pieceFullDetails'
import { GetStaticPathsResult } from 'next'
import NextLink from 'next/link'
import gql from '@app/lib/graphql/tag'
import { GetPartialFilmPiecesDocument, GetFilmPieceBySlugDocument } from './_gql_/[slug]'
import staticClient from '@app/common/graphql/staticClient'
import { Box, Text, Anchor, Button, Divider } from '@luzzle/ui/components'
import * as styles from './[slug].css'
import { CaretLeft, CaretRight } from 'phosphor-react'
import DiscussionForm from '@app/common/components/discussions/DiscussionForm'
import { useState } from 'react'
import { ResultOneOf, ResultSuccessOf } from '@app/@types/utilities'
import config from '@app/common/config'
import FilmCoverFor from '@app/common/components/films/FilmCoverFor'
import Markdown from 'react-markdown'

const partialFilmsQuery = gql<
	typeof GetPartialFilmPiecesDocument
>(`query GetPartialFilmPieces($take: Int, $page: Int, $type: String) {
  pieces(take: $take, page: $page, type: $type) {
    slug
		dateOrder
  }
}`)

const filmQuery = gql<typeof GetFilmPieceBySlugDocument>(
	`query GetFilmPieceBySlug($slug: String!, $type: String) {
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

type FilmPiece = ResultSuccessOf<typeof filmQuery, 'piece'>
type FilmOrderPartial = ResultOneOf<typeof partialFilmsQuery, 'pieces'>
type FilmPageStaticParams = { params: FilmOrderPartial }
type FilmPageProps = { film: FilmPiece }

function makeSiblingLink(image: JSX.Element, slug?: string): JSX.Element {
	if (slug) {
		return (
			<NextLink href={`/pieces/films/${slug}`} passHref>
				<Anchor color={'inherit'} className={styles.navigation}>
					{image}
				</Anchor>
			</NextLink>
		)
	}

	return <Anchor disabled>{image}</Anchor>
}

export default function FilmPage({ film }: FilmPageProps): JSX.Element {
	const [showForm, setShowForm] = useState(false)

	const discussionForm = (
		<DiscussionForm type="films" slug={film.slug} onClose={() => setShowForm(false)} />
	)

	const filmPage = (
		<Box>
			<Box>
				<Box className={styles.filmCard}>
					<Box>{makeSiblingLink(<CaretLeft size={45} />, film.siblings?.previous?.slug)}</Box>
					<Box style={{ marginBottom: '-200px' }}>
						<FilmCoverFor
							piece={{
								title: film.title,
								slug: film.slug,
								media: film.media,
								id: film.id,
							}}
							title={film.title}
							hasMedia={!!film.media}
							size={'LARGE'}
						/>
					</Box>
					<Box>{makeSiblingLink(<CaretRight size={45} />, film.siblings?.next?.slug)}</Box>
				</Box>
			</Box>
			<Box>
				<Box className={styles.filmContainer}>
					<Box className={styles.filmDetails}>
						<Box style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
							<Button
								onClick={() => setShowForm(true)}
								raised
								use={'primary'}
								className={styles.filmDiscuss}
							>
								discuss
							</Button>
						</Box>
						<br />
						<Text as="h3" size="h3">
							notes
						</Text>
						<br />
						<Text as="h1" size="title">
							{film.title}
						</Text>
						{film.dateOrder && (
							<Text size="caption">watched on {new Date(film.dateOrder).toLocaleDateString()}</Text>
						)}
						<br />
						<Text as="h3" size="h3">
							notes
						</Text>
						<br />
						<Box>
							<Markdown>{film.note || '---'}</Markdown>
						</Box>
						<br />
						<Divider />
						<br />
						<Text as="h3" size="h3">
							about
						</Text>
						<br />
						<Box>
							<Text className={styles.filmNote}>
								{(film.summary || '---').split('\n').map((p, i) => (
									<p key={i}>{p}</p>
								))}
							</Text>
						</Box>
						<br />
						<Text size="caption">
							{!!film.tags?.length && <span>tags - </span>}
							{film.tags?.map((tag) => (
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
				title: film.title,
				image: `${config.public.HOST_STATIC}/images/og/films/${film.slug}.png`,
				description: film.summary || '',
			}}
			invert
		>
			{showForm ? discussionForm : filmPage}
		</PageFull>
	)
}

async function getFilmsForPage(take: number, page?: number): Promise<FilmOrderPartial[]> {
	const response = await staticClient.query({
		query: partialFilmsQuery,
		variables: { take, page, type: 'films' },
	})
	const films = response.data.pieces?.filter(Boolean) || []
	const partialLinks = films.map((film) => ({ slug: film.slug, dateOrder: film.dateOrder }))

	return partialLinks
}

async function getAllLinkSlugs(): Promise<string[]> {
	const take = 100
	const slugs: string[] = []

	let partialFilm = await getFilmsForPage(take)
	let page = 0
	slugs.push(...partialFilm.map((film) => film.slug))

	while (partialFilm.length === take) {
		partialFilm = await getFilmsForPage(take, page)
		slugs.push(...partialFilm.map((film) => film.slug))
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
}: FilmPageStaticParams): Promise<{ props: FilmPageProps } | { notFound: true }> {
	const graphQlresponse = await staticClient.query({
		query: filmQuery,
		variables: { slug: params.slug, type: 'films' },
	})
	const response = graphQlresponse.data.piece

	if (response?.__typename === 'QueryPieceSuccess') {
		return {
			props: {
				film: response.data,
			},
		}
	} else {
		return {
			notFound: true,
		}
	}
}
