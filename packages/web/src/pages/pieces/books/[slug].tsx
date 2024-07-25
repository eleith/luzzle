import PageFull from '@app/common/components/layout/PageFull'
import pieceFragment from '@app/common/graphql/piece/fragments/pieceFullDetails'
import { GetStaticPathsResult } from 'next'
import Link from 'next/link'
import gql from '@app/lib/graphql/tag'
import { GetPartialBookPiecesDocument, GetBookPieceBySlugDocument } from './_gql_/[slug]'
import { BookCoverFor } from '@app/common/components/books'
import staticClient from '@app/common/graphql/staticClient'
import { Box, Text, Anchor, Button, Divider } from '@luzzle/ui/components'
import * as styles from './[slug].css'
import { CaretLeft, CaretRight, LinkSimple } from 'phosphor-react'
import DiscussionForm from '@app/common/components/discussions/DiscussionForm'
import { useState } from 'react'
import { ResultOneOf, ResultSuccessOf } from '@app/@types/utilities'
import config from '@app/common/config'

const partialBooksQuery = gql<
	typeof GetPartialBookPiecesDocument
>(`query GetPartialBookPieces($take: Int, $page: Int, $type: String) {
  pieces(take: $take, page: $page, type: $type) {
    slug
		dateOrder
  }
}`)

const bookQuery = gql<typeof GetBookPieceBySlugDocument>(
	`query GetBookPieceBySlug($slug: String!, $type: String) {
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

type Book = ResultSuccessOf<typeof bookQuery, 'piece'>
type BookOrderPartial = ResultOneOf<typeof partialBooksQuery, 'pieces'>
type BookPageStaticParams = { params: BookOrderPartial }
type BookPageProps = { book: Book }
type BookMetdata = {
	url?: string
	subtitle?: string
	author: string
	coauthors?: string
}

function makeBookDateString(book?: Book): string {
	const month =
		book && typeof book.dateOrder === 'number' ? new Date(book.dateOrder).getMonth() + 1 : '?'
	const year =
		book && typeof book.dateOrder === 'number' ? new Date(book.dateOrder).getFullYear() : '?'

	return `${month} / ${year}`
}

function makeSiblingLink(image: JSX.Element, slug?: string): JSX.Element {
	if (slug) {
		return (
			<Link href={`/pieces/books/${slug}`} passHref>
				<Anchor color={'inherit'} className={styles.navigation}>
					{image}
				</Anchor>
			</Link>
		)
	}

	return <Anchor disabled>{image}</Anchor>
}

export default function BookPage({ book }: BookPageProps): JSX.Element {
	const [showForm, setShowForm] = useState(false)

	const discussionForm = (
		<DiscussionForm type="books" slug={book.slug} onClose={() => setShowForm(false)} />
	)

	const metadata = (book.metadata ? JSON.parse(book.metadata) : {}) as BookMetdata

	const bookPage = (
		<Box>
			<Box>
				<Box className={styles.bookCard}>
					<Box>{makeSiblingLink(<CaretLeft size={45} />, book.siblings?.previous?.slug)}</Box>
					<Box>
						<BookCoverFor
							piece={{ title: book.title, slug: book.slug, media: book.media, id: book.id }}
							hasCover={!!book.media}
							rotateInteract={{ x: 0, y: -45 }}
							scale={1.35}
						/>
					</Box>
					<Box>{makeSiblingLink(<CaretRight size={45} />, book.siblings?.next?.slug)}</Box>
				</Box>
			</Box>
			<Box>
				<Box className={styles.bookContainer}>
					<Box className={styles.bookDetails}>
						<Box style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
							{metadata.url && (
								<Anchor href={metadata.url}>
									<Button minimal use={'primary'} className={styles.bookDiscuss}>
										<LinkSimple size={36} />
									</Button>
								</Anchor>
							)}

							<Button
								onClick={() => setShowForm(true)}
								raised
								use={'primary'}
								className={styles.bookDiscuss}
							>
								discuss
							</Button>
						</Box>
						<Text as="h1" size="title">
							{book.title}
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
							notes
						</Text>
						<br />
						<Box>
							<Text className={styles.bookNote}>
								{(book.note || '---').split('\n\n').map((p, i) => (
									<p key={i}>{p}</p>
								))}
							</Text>
						</Box>
						<br />
						<br />
						<Box>
							<Text>read on {makeBookDateString(book)}</Text>
						</Box>
						<br />
						<Divider />
						<br />
						<Text as="h3" size="h3">
							about
						</Text>
						<br />
						<Box>
							<Text className={styles.bookNote}>
								{(book.summary || '---').split('\n').map((p, i) => (
									<p key={i}>{p}</p>
								))}
							</Text>
						</Box>
						<br />
						<Text size="caption">
							<span>tags - </span>
							{book.tags?.map((tag) => (
								<span key={tag.slug}>
									<Link href={`/tags/${tag.slug}`} passHref>
										<Anchor hoverAction="underline">{tag.name}</Anchor>
									</Link>{' '}
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
				title: book.title,
				image: `${config.public.HOST_STATIC}/images/og/books/${book.slug}.png`,
				description: book.note || book.summary || '',
			}}
			invert
		>
			{showForm ? discussionForm : bookPage}
		</PageFull>
	)
}

async function getBooksForPage(take: number, page?: number): Promise<BookOrderPartial[]> {
	const response = await staticClient.query({
		query: partialBooksQuery,
		variables: { take, page, type: 'books' },
	})
	const books = response.data.pieces?.filter(Boolean) || []
	return books.map((book) => ({ slug: book.slug, dateOrder: book.dateOrder }))
}

async function getAllBookSlugs(): Promise<string[]> {
	const take = 100
	const slugs: string[] = []

	let partialBooks = await getBooksForPage(take)
	let page = 0
	slugs.push(...partialBooks.map((book) => book.slug))

	while (partialBooks.length === take) {
		partialBooks = await getBooksForPage(take, page)
		slugs.push(...partialBooks.map((book) => book.slug))
		page += 1
	}

	return slugs
}

export async function getStaticPaths(): Promise<GetStaticPathsResult> {
	const slugs = await getAllBookSlugs()

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
}: BookPageStaticParams): Promise<{ props: BookPageProps } | { notFound: true }> {
	const graphQlresponse = await staticClient.query({
		query: bookQuery,
		variables: { slug: params.slug, type: 'books' },
	})
	const response = graphQlresponse.data.piece

	if (response?.__typename === 'QueryPieceSuccess') {
		return {
			props: {
				book: response.data,
			},
		}
	} else {
		return {
			notFound: true,
		}
	}
}
