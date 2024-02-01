import { BookCoverFor } from '@app/common/components/books'
import PageFull from '@app/common/components/layout/PageFull'
import gql from '@app/lib/graphql/tag'
import bookFragment from '@app/common/graphql/book/fragments/bookFullDetails'
import { GetBooksDocument } from './_gql_/index'
import staticClient from '@app/common/graphql/staticClient'
import { Box, Anchor } from '@luzzle/ui/components'
import useGraphSWRInfinite from '@app/common/hooks/useGraphSWRInfinite'
import { useState } from 'react'
import { ResultOf } from '@graphql-typed-document-node/core'
import Link from 'next/link'
import * as styles from './index.css'

const getBooksQuery = gql<typeof GetBooksDocument>(
	`query GetBooks($take: Int, $page: Int) {
  books(take: $take, page: $page) {
    ...BookFullDetails
  }
}
`,
	bookFragment
)

type GetBooksQuery = ResultOf<typeof getBooksQuery>
type Book = NonNullable<GetBooksQuery['books']>[number]

type BooksProps = {
	books: Book[]
}

const TAKE = 50

function makeBookCardLink(book: Book, index = 0): JSX.Element {
	return (
		<Link href={`/books/${book.slug}`} key={book.id}>
			<a>
				<Box>
					<BookCoverFor
						book={book}
						hasCover={!!book.cover}
						scale={0.5}
						rotateInteract={{ x: 0, y: -35 }}
						imgLoading={index < 10 ? 'eager' : 'lazy'}
					/>
				</Box>
			</a>
		</Link>
	)
}

export async function getStaticProps(): Promise<{ props: BooksProps }> {
	const response = await staticClient.query({ query: getBooksQuery, variables: { take: TAKE } })

	return {
		props: {
			books: response.data?.books || [],
		},
	}
}

export default function Books({ books }: BooksProps): JSX.Element {
	const totalBooks: Book[] = []
	const [shouldFetch, setFetch] = useState(false)
	const { data, size, setSize } = useGraphSWRInfinite(
		(page, previousData: GetBooksQuery | null) => {
			const lastData = previousData?.books || books
			if (shouldFetch && lastData.length === TAKE) {
				return {
					gql: getBooksQuery,
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

	const lastPage = data?.[data.length - 1]?.books || []
	const isEnd = size !== 1 && (lastPage.length === 0 || lastPage.length < TAKE)

	if (data) {
		const pages = data.reduce((total, query) => [...total, ...(query.books || [])], [] as Book[])
		totalBooks.push(...books, ...pages)
	} else {
		totalBooks.push(...books)
	}

	function loadMore(): void {
		if (size === 1) {
			setFetch(true)
		}
		setSize(size + 1)
	}

	const allBooks = totalBooks.map((book, i) => makeBookCardLink(book, i))

	return (
		<PageFull meta={{ title: 'books' }}>
			<Box>
				<Box className={styles.booksContainer}>{allBooks}</Box>
				{!isEnd && (
					<Box className={styles.booksActions}>
						<Anchor onClick={loadMore}>get more books</Anchor>
					</Box>
				)}
			</Box>
		</PageFull>
	)
}
