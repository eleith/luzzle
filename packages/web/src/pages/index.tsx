import PageFull from '@app/common/components/layout/PageFull'
import pieceFragment from '@app/common/graphql/piece/fragments/pieceFullDetails'
import gql from '@app/lib/graphql/tag'
import { GetPieceHomeDocument } from './_gql_/index'
import staticClient from '@app/common/graphql/staticClient'
import NextLink from 'next/link'
import { Box, Text, Anchor } from '@luzzle/ui/components'
import { ResultOf } from '@graphql-typed-document-node/core'
import * as styles from './index.css'

const getPiecesQuery = gql<typeof GetPieceHomeDocument>(
	`query GetPieceHome($take: Int, $type: String) {
  pieces(take: $take, type: $type) {
    ...PieceFullDetails
  }
}`,
	pieceFragment
)

type Piece = NonNullable<ResultOf<typeof getPiecesQuery>['pieces']>[number]

type HomePageProps = {
	book: Piece
	link: Piece
	text: Piece
}

function makeNextLink(text: string, href: string) {
	return (
		<NextLink href={href} passHref>
			<Anchor hoverAction="animateUnderline">{text}</Anchor>
		</NextLink>
	)
}

export async function getStaticProps(): Promise<{ props: HomePageProps }> {
	const responseBooks = await staticClient.query({
		query: getPiecesQuery,
		variables: { take: 1, type: 'books' },
	})
	const responseLinks = await staticClient.query({
		query: getPiecesQuery,
		variables: { take: 1, type: 'links' },
	})
	const responseTexts = await staticClient.query({
		query: getPiecesQuery,
		variables: { take: 1, type: 'texts' },
	})

	const books = responseBooks.data?.pieces
	const links = responseLinks.data?.pieces
	const texts = responseTexts.data?.pieces
	const nonExistant = { title: 'a title', id: 'add-more-books' } as Piece

	return {
		props: {
			book: books?.[0] || nonExistant,
			link: links?.[0] || nonExistant,
			text: texts?.[0] || nonExistant,
		},
	}
}

export default function Home({ book, link, text }: HomePageProps): JSX.Element {
	return (
		<PageFull meta={{ title: 'books' }} isHome>
			<Box className={styles.page}>
				<Box>
					<Text as="h1" size={'title'}>
						hello
					</Text>
					<br />
					<Text as="h2" size={'h1'}>
						this site allows me to recall and share {makeNextLink('things', '/pieces')} like{' '}
						{makeNextLink('books', '/pieces/books')} and {makeNextLink('links', '/pieces/links')}{' '}
						and {makeNextLink('texts', '/pieces/texts')}
					</Text>
					<br />
					<Text as="h3" size={'h1'}>
						a recent book
						<br />
						{makeNextLink(book.title, `/pieces/books/${book.slug}`)}
					</Text>
					<br />
					<Text as="h3" size={'h1'}>
						a recent link
						<br />
						{makeNextLink(link.title, `/pieces/links/${link.slug}`)}
					</Text>
					<br />
					<Text as="h3" size={'h1'}>
						a recent text
						<br />
						{makeNextLink(text.title, `/pieces/texts/${text.slug}`)}
					</Text>
				</Box>
			</Box>
		</PageFull>
	)
}
