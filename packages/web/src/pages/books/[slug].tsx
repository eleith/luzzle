import PageFull from '@app/common/components/layout/PageFull'
import bookFragment from '@app/common/graphql/book/fragments/bookFullDetails'
import { GetStaticPathsResult } from 'next'
import Link from 'next/link'
import gql from '@app/lib/graphql/tag'
import { GetPartialBooksDocument, GetBookBySlugDocument } from './_gql_/[slug]'
import { BookCoverFor } from '@app/common/components/books'
import staticClient from '@app/common/graphql/staticClient'
import { Box, Text, Anchor, Button, Divider } from '@luzzle/ui/components'
import * as styles from './[slug].css'
import { CaretLeft, CaretRight, LinkSimple } from 'phosphor-react'
import DiscussionForm from '@app/common/components/pages/book/DiscussionForm'
import { useState } from 'react'
import { ResultOneOf, ResultSuccessOf } from '@app/@types/utilities'

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
    __typename
    ... on Error {
      message
    }
    ... on QueryBookSuccess {
      data {
        ...BookFullDetails
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
  bookFragment
)

type Book = ResultSuccessOf<typeof bookQuery, 'book'>
type BookOrderPartial = ResultOneOf<typeof partialBooksQuery, 'books'>
type BookPageStaticParams = { params: BookOrderPartial }
type BookPageProps = { book: Book }

function makeBookDateString(book?: Book): string {
  const month = book && typeof book.monthRead === 'number' ? book.monthRead : '?'
  const year = book && typeof book.yearRead === 'number' ? book.yearRead : '?'

  return `${month} / ${year}`
}

function makeSiblingLink(image: JSX.Element, slug?: string): JSX.Element {
  if (slug) {
    return (
      <Link href={`/books/${slug}`} passHref>
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

  const discussionForm = <DiscussionForm slug={book.slug} onClose={() => setShowForm(false)} />

  const bookPage = (
    <Box>
      <Box>
        <Box className={styles.bookCard}>
          <Box>{makeSiblingLink(<CaretLeft size={45} />, book.siblings?.previous?.slug)}</Box>
          <Box>
            <BookCoverFor
              book={book}
              hasCover={!!book.coverWidth}
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
              {book.idOlWork && (
                <Anchor href={`https://openlibrary.org/works/${book.idOlWork}`}>
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
            {book.subtitle && (
              <Text as="h2" size="h3">
                {book.subtitle}
              </Text>
            )}
            <Text>
              by {book.author}
              {book.coauthors && `, ${book.coauthors?.split(',').join(', ')}`}
            </Text>
            <br />
            <Divider />
            <br />
            <Text as="h3" size="h3">
              notes
            </Text>
            <br />
            <Box>
              <Text>{book.note || ' --- '}</Text>
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
              <Text>{book.description || ' --- '}</Text>
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
        image: `/api/books/og:image?slug=${book.slug}`,
        description: book.note || book.description || '',
      }}
      invert
    >
      {showForm ? discussionForm : bookPage}
    </PageFull>
  )
}

async function getBooksForPage(take: number, after?: string): Promise<BookOrderPartial[]> {
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
    fallback: 'blocking',
  }
}

export async function getStaticProps({
  params,
}: BookPageStaticParams): Promise<{ props: BookPageProps } | { notFound: true }> {
  const graphQlresponse = await staticClient.query({
    query: bookQuery,
    variables: { slug: params.slug },
  })
  const response = graphQlresponse.data.book

  if (response?.__typename === 'QueryBookSuccess') {
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
