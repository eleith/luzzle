import Page from '@app/common/components/page'
import bookFragment from '@app/common/graphql/book/fragments/bookFullDetails'
import { GetStaticPathsResult } from 'next'
import Link from 'next/link'
import gql from '@app/graphql/tag'
import { GetPartialBooksDocument, GetBookBySlugDocument } from './_gql_/[slug]'
import { BookCoverFor } from '@app/common/components/books'
import staticClient from '@app/common/graphql/staticClient'
import { Box, Text, Container, Grid } from '@app/common/components/ui'
import { ResultOf } from '@graphql-typed-document-node/core'

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

export default function BookPage({ book }: BookPageProps): JSX.Element {
  return (
    <Page meta={{ title: `${book.title}` }}>
      <Container>
        <Grid
          css={{
            width: '100%',
            margin: 'auto',
            marginTop: '20px',
            gridTemplateColumns: '1fr',
            gridTemplateRows: 'fit-content fit-content',
            gridAutoFlow: 'row',
            justifyItems: 'center',
            alignItems: 'flex-start',
            gap: '40px',
            '@tablet': {
              width: '100%',
              margin: 'auto',
              marginTop: '150px',
              gridTemplateColumns: '150px 1fr',
              gridTemplateRows: '1fr',
              gridAutoFlow: 'column',
              justifyItems: 'center',
              alignItems: 'flex-start',
              gap: '40px',
            },
            '@desktop': {
              width: '70%',
              margin: 'auto',
              marginTop: '150px',
              gridTemplateColumns: '200px 1fr',
              gridTemplateRows: '1fr',
              gridAutoFlow: 'column',
              justifyItems: 'center',
              alignItems: 'flex-start',
              gap: '40px',
            },
          }}
        >
          <Box>
            <BookCoverFor
              book={book}
              hasCover={!!book.coverWidth}
              rotateInteract={{ x: 0, y: -35 }}
            />
            <Text as="p" css={{ textAlign: 'center', marginTop: 15 }}>
              read on {book.monthRead}/{book.yearRead}
            </Text>
          </Box>
          <Box
            css={{
              padding: '20px',
              width: '100%',
              '@tablet': { padding: '0px 20px 0px 0px', width: '100%' },
              '@desktop': { padding: '0px', width: '100%' },
            }}
          >
            <Text as="h1">{book.title}</Text>
            {book.subtitle && (
              <Text>
                <br />
                {book.subtitle}
              </Text>
            )}
            <Text>
              by {book.author} {book.coauthors}
            </Text>
            <br />
            <br />
            <Text>
              isbn: <a href={`https://openlibrary.org/works/${book.idOlWork}`}>{book.isbn}</a>
            </Text>
            <br />
            <Text>published: {book.yearFirstPublished}</Text>
            <br />
            <Text>pages: {book.pages}</Text>
            {book.siblings?.previous && (
              <Text>
                <Link href={`/books/${book.siblings.previous.slug}`}>
                  <a>previous</a>
                </Link>
              </Text>
            )}
            {book.siblings?.next && (
              <Text>
                <Link href={`/books/${book.siblings.next.slug}`}>
                  <a>next</a>
                </Link>
              </Text>
            )}
          </Box>
        </Grid>
      </Container>
    </Page>
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
