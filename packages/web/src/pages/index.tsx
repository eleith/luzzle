import PageFull from '@app/common/components/layout/PageFull'
import bookFragment from '@app/common/graphql/book/fragments/bookFullDetails'
import linkFragment from '@app/common/graphql/link/fragments/linkFullDetails'
import gql from '@app/lib/graphql/tag'
import { GetBookHomeDocument, GetLinkHomeDocument } from './_gql_/index'
import staticClient from '@app/common/graphql/staticClient'
import NextLink from 'next/link'
import { Box, Text, Anchor } from '@luzzle/ui/components'
import { ResultOf } from '@graphql-typed-document-node/core'
import * as styles from './index.css'

const getBooksQuery = gql<typeof GetBookHomeDocument>(
	`query GetBookHome($take: Int) {
  books(take: $take) {
    ...BookFullDetails
  }
}`,
	bookFragment
)

const getLinksQuery = gql<typeof GetLinkHomeDocument>(
	`query GetLinkHome($take: Int) {
  links(take: $take) {
    ...LinkFullDetails
  }
}`,
	linkFragment
)

type Book = NonNullable<ResultOf<typeof getBooksQuery>['books']>[number]
type Link = NonNullable<ResultOf<typeof getLinksQuery>['links']>[number]

type HomePageProps = {
	book: Book
	link: Link
}

function makeNextLink(text: string, href: string) {
	return (
		<NextLink href={href} passHref>
			<Anchor hoverAction="animateUnderline">{text}</Anchor>
		</NextLink>
	)
}

export async function getStaticProps(): Promise<{ props: HomePageProps }> {
	const responseBooks = await staticClient.query({ query: getBooksQuery, variables: { take: 1 } })
	const responseLinks = await staticClient.query({ query: getLinksQuery, variables: { take: 1 } })

	const books = responseBooks.data?.books
	const links = responseLinks.data?.links
	const nonExistantBook = { title: 'a title', id: 'add-more-books' } as Book
	const nonExistantLink = { title: 'a title', id: 'add-more-links' } as Link

	return {
		props: {
			book: books?.[0] || nonExistantBook,
			link: links?.[0] || nonExistantLink,
		},
	}
}

export default function Home({ book, link }: HomePageProps): JSX.Element {
	return (
		<PageFull meta={{ title: 'books' }} isHome>
			<Box className={styles.page}>
				<Box>
					<Text as="h1" size={'title'}>
						hello
					</Text>
					<br />
					<Text as="h2" size={'h1'}>
						this site allows me to recall and share {makeNextLink('books', '/books')} and{' '}
						{makeNextLink('links', '/links')}
					</Text>
					<br />
					<Text as="h3" size={'h1'}>
						a recent book - &nbsp;
						{makeNextLink(book.title, `/books/${book.slug}`)}
					</Text>
					<br />
					<Text as="h3" size={'h1'}>
						a recent link - &nbsp;
						{makeNextLink(link.title, `/links/${link.slug}`)}
					</Text>
				</Box>
			</Box>
		</PageFull>
	)
}
