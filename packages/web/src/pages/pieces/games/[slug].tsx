import PageFull from '@app/common/components/layout/PageFull'
import gameFragment from '@app/common/graphql/games/fragments/gameFullDetails'
import { GetStaticPathsResult } from 'next'
import NextLink from 'next/link'
import gql from '@app/lib/graphql/tag'
import { GetPartialGamesDocument, GetGameBySlugDocument } from './_gql_/[slug]'
import staticClient from '@app/common/graphql/staticClient'
import { Box, Text, Anchor, Button, Divider } from '@luzzle/ui/components'
import * as styles from './[slug].css'
import { CaretLeft, CaretRight } from 'phosphor-react'
import DiscussionForm from '@app/common/components/discussions/DiscussionForm'
import { useState } from 'react'
import { ResultOneOf, ResultSuccessOf } from '@app/@types/utilities'
import config from '@app/common/config'
import GameCoverFor from '@app/common/components/games/GameCoverFor'
import Markdown from 'react-markdown'

const partialGamesQuery = gql<
	typeof GetPartialGamesDocument
>(`query GetPartialGames($take: Int, $page: Int) {
  games(take: $take, page: $page) {
    slug
		datePlayed
  }
}`)

const gameQuery = gql<typeof GetGameBySlugDocument>(
	`query GetGameBySlug($slug: String!) {
  game(slug: $slug) {
    __typename
    ... on Error {
      message
    }
    ... on QueryGameSuccess {
      data {
        ...GameFullDetails
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
	gameFragment
)

type GamePiece = ResultSuccessOf<typeof gameQuery, 'game'>
type GameOrderPartial = ResultOneOf<typeof partialGamesQuery, 'games'>
type GamePageStaticParams = { params: GameOrderPartial }
type GamePageProps = { game: GamePiece }

function makeSiblingLink(image: JSX.Element, slug?: string): JSX.Element {
	if (slug) {
		return (
			<NextLink href={`/pieces/games/${slug}`} passHref>
				<Anchor color={'inherit'} className={styles.navigation}>
					{image}
				</Anchor>
			</NextLink>
		)
	}

	return <Anchor disabled>{image}</Anchor>
}

export default function GamePage({ game }: GamePageProps): JSX.Element {
	const [showForm, setShowForm] = useState(false)

	const discussionForm = (
		<DiscussionForm type="games" slug={game.slug} onClose={() => setShowForm(false)} />
	)

	const gamePage = (
		<Box>
			<Box>
				<Box className={styles.gameCard}>
					<Box>{makeSiblingLink(<CaretLeft size={45} />, game.siblings?.previous?.slug)}</Box>
					<Box style={{ marginBottom: '-200px' }}>
						<GameCoverFor
							piece={{
								title: game.title,
								slug: game.slug,
								media: game.representativeImage,
								id: game.id,
							}}
							title={game.title}
							hasMedia={!!game.representativeImage}
							size={'LARGE'}
						/>
					</Box>
					<Box>{makeSiblingLink(<CaretRight size={45} />, game.siblings?.next?.slug)}</Box>
				</Box>
			</Box>
			<Box>
				<Box className={styles.gameContainer}>
					<Box className={styles.gameDetails}>
						<Box style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
							<Button
								onClick={() => setShowForm(true)}
								raised
								use={'primary'}
								className={styles.gameDiscuss}
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
							{game.title}
						</Text>
						{game.datePlayed && (
							<Text size="caption">played on {new Date(game.datePlayed).toLocaleDateString()}</Text>
						)}
						<br />
						<Text as="h3" size="h3">
							notes
						</Text>
						<br />
						<Box>
							<Markdown>{game.note || '---'}</Markdown>
						</Box>
						<br />
						<Divider />
						<br />
						<Text as="h3" size="h3">
							about
						</Text>
						<br />
						<Box>
							<Text className={styles.gameNote}>
								{(game.description || '---').split('\n').map((p, i) => (
									<p key={i}>{p}</p>
								))}
							</Text>
						</Box>
						<br />
						<Text size="caption">
							{!!game.tags?.length && <span>tags - </span>}
							{game.tags?.map((tag) => (
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
				title: game.title,
				image: `${config.public.HOST_STATIC}/images/og/games/${game.slug}.png`,
				description: game.description || '',
			}}
			invert
		>
			{showForm ? discussionForm : gamePage}
		</PageFull>
	)
}

async function getGamesForPage(take: number, page?: number): Promise<GameOrderPartial[]> {
	const response = await staticClient.query({
		query: partialGamesQuery,
		variables: { take, page },
	})
	const games = response.data.games?.filter(Boolean) || []
	const partialLinks = games.map((game) => ({ slug: game.slug, datePlayed: game.datePlayed }))

	return partialLinks
}

async function getAllLinkSlugs(): Promise<string[]> {
	const take = 100
	const slugs: string[] = []

	let partialGame = await getGamesForPage(take)
	let page = 0
	slugs.push(...partialGame.map((game) => game.slug))

	while (partialGame.length === take) {
		partialGame = await getGamesForPage(take, page)
		slugs.push(...partialGame.map((game) => game.slug))
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
}: GamePageStaticParams): Promise<{ props: GamePageProps } | { notFound: true }> {
	const graphQlresponse = await staticClient.query({
		query: gameQuery,
		variables: { slug: params.slug },
	})
	const response = graphQlresponse.data.game

	if (response?.__typename === 'QueryGameSuccess') {
		return {
			props: {
				game: response.data,
			},
		}
	} else {
		return {
			notFound: true,
		}
	}
}
