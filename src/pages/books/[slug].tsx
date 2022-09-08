import PageFull from '@app/common/components/layout/PageFull'
import bookFragment from '@app/common/graphql/book/fragments/bookFullDetails'
import { GetStaticPathsResult } from 'next'
import Link from 'next/link'
import gql from '@app/lib/graphql/tag'
import { GetPartialBooksDocument, GetBookBySlugDocument } from './_gql_/[slug]'
import { BookCoverFor } from '@app/common/components/books'
import staticClient from '@app/common/graphql/staticClient'
import { Box, Text, Anchor, Divider, Button } from '@app/common/ui/components'
import { ResultOf } from '@graphql-typed-document-node/core'
import * as styles from './[slug].css'
import { CaretLeft, CaretRight, ChatsCircle } from 'phosphor-react'
import config from '@app/common/config'
import DiscussionForm from '@app/common/components/pages/book/DiscussionForm'
import { useState } from 'react'

interface BookPageStaticParams {
  params: {
    slug: string
    readOrder: string
  }
}

const partialBooksQuery = gql<
  typeof GetPartialBooksDocument
>(`query GetPartialBooks($take: Int, $after: String) {
  books(take: $take, after: $after) {
    slug
    readOrder
  }
}`)

const bookQuery = gql<typeof GetBookBySlugDocument>(
  `query GetBookBySlug($slug: String!) {
  book(slug: $slug) {
    ...BookFullDetails,
    siblings {
      previous {
        slug
      }
      next {
        slug
      }
    }
  }
}`,
  bookFragment
)

type Book = NonNullable<ResultOf<typeof bookQuery>['book']>
type PartialBook = NonNullable<ResultOf<typeof partialBooksQuery>['books']>[number]

interface BookPageProps {
  book: Book
}

export async function getStaticProps({
  params,
}: BookPageStaticParams): Promise<{ props: BookPageProps }> {
  const response = await staticClient.query({
    query: bookQuery,
    variables: { slug: params.slug },
  })
  const book = response.data.book

  if (book) {
    return {
      props: {
        book,
      },
    }
  } else {
    throw `Error: book(slug=${params.slug}) not found`
  }
}

function makeBookDateString(book?: Book): string {
  const month = book && typeof book.monthRead === 'number' ? book.monthRead : '?'
  const year = book && typeof book.yearRead === 'number' ? book.yearRead : '?'

  return `${month} / ${year}`
}

function makeNextLink(book: Book): JSX.Element {
  if (book.siblings?.next) {
    return (
      <Link href={`/books/${book.siblings.next.slug}`} passHref>
        <Anchor>
          <CaretRight size={45} />
        </Anchor>
      </Link>
    )
  }

  return (
    <Anchor disabled>
      <CaretRight size={45} />
    </Anchor>
  )
}

function makePreviousLink(book: Book): JSX.Element {
  if (book.siblings?.previous) {
    return (
      <Link href={`/books/${book.siblings.previous.slug}`} passHref>
        <Anchor>
          <CaretLeft size={45} />
        </Anchor>
      </Link>
    )
  }

  return (
    <Anchor disabled>
      <CaretLeft size={45} />
    </Anchor>
  )
}

export default function BookPage({ book }: BookPageProps): JSX.Element {
  const coverUrl = `${config.HOST_STATIC}/images/covers/${book.slug}.jpg`
  const [showForm, setShowForm] = useState(false)

  const discussionForm = <DiscussionForm slug={book.slug} onClose={() => setShowForm(false)} />

  const bookPage = (
    <Box>
      <Box className={styles.bookContainer}>
        <Box className={styles.bookNavigation}>{makePreviousLink(book)}</Box>
        <Box className={styles.bookDetails}>
          <Text as="h1" size="title">
            {book.title}
          </Text>
          {book.subtitle && (
            <Text as="h2" size="h3">
              {book.subtitle}
            </Text>
          )}
          <Text>
            by {book.author}
            {book.coauthors && `, ${book.coauthors?.split(',').join(', ')}`}
          </Text>
          <Divider />
          <Box className={styles.bookCard}>
            <Box className={styles.book}>
              <BookCoverFor
                book={book}
                hasCover={!!book.coverWidth}
                rotate={{ x: 0, y: -35 }}
                rotateInteract={{ x: 0, y: 0 }}
              />
            </Box>
            <Box>
              <Text>read on {makeBookDateString(book)}</Text>
              {book.idOlWork && book.isbn && (
                <Text>
                  isbn{' '}
                  <Anchor href={`https://openlibrary.org/works/${book.idOlWork}`}>
                    {book.isbn}
                  </Anchor>
                </Text>
              )}
              {book.yearFirstPublished && <Text>published in {book.yearFirstPublished}</Text>}
              <Text>{book.pages} pages</Text>
              <br />
              <Button
                onClick={() => setShowForm(true)}
                raised
                use={'primary'}
                className={styles.hideOnMobile}
              >
                discuss
              </Button>
              <Button
                onClick={() => setShowForm(true)}
                raised
                use={'primary'}
                action
                className={styles.showOnMobile}
              >
                <ChatsCircle size={24} /> discuss
              </Button>
            </Box>
          </Box>
        </Box>
        <Box className={styles.bookNavigation}>{makeNextLink(book)}</Box>
      </Box>
    </Box>
  )

  return (
    <PageFull meta={{ title: book.title, image: coverUrl }}>
      {showForm ? discussionForm : bookPage}
    </PageFull>
  )
}

async function getBooksForPage(take: number, after?: string): Promise<PartialBook[]> {
  const response = await staticClient.query({
    query: partialBooksQuery,
    variables: { take, after },
  })
  const books = response.data.books?.filter(Boolean) || []
  const partialBooks = books.map((book) => ({ slug: book.slug, readOrder: book.readOrder }))

  return partialBooks
}

async function getAllBookSlugs(): Promise<string[]> {
  const take = 100
  const slugs: string[] = []

  let partialBooks = await getBooksForPage(take)
  slugs.push(...partialBooks.map((book) => book.slug))

  while (partialBooks.length === take) {
    const lastBook = partialBooks[partialBooks.length - 1].readOrder
    partialBooks = await getBooksForPage(take, lastBook)
    slugs.push(...partialBooks.map((book) => book.slug))
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
    fallback: false,
  }
}
