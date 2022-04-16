import Page from '@app/common/components/page'
import { GetStaticPathsResult } from 'next'
import Link from 'next/link'
import gql from '@app/graphql/tag'
import { GetBookSlugsDocument, GetBookBySlugDocument } from './_gql_/[slug]'
import BookCover from '@app/common/components/books'
import localRequest from '@app/lib/graphql/localRequest'
import { ExtractResultFieldTypeFor } from '@app/lib/graphql/types'
import config from '@app/common/config'
import { Box, Text, Container, Grid } from '@app/common/components/ui'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'

interface BookPageStaticParams {
  params: {
    slug: string
  }
}

const booksSlugQuery = gql<
  typeof GetBookSlugsDocument
>(`query GetBookSlugs($take: Int, $skip: Int) {
  books(take: $take, skip: $skip) {
    slug
  }
}`)

const bookQuery = gql<typeof GetBookBySlugDocument>(`query GetBookBySlug($slug: String!) {
  book(slug: $slug) {
    slug
    id
    cover_width
    cover_height
    title
    coauthors
    description
    author
    isbn
    subtitle
    year_first_published
    pages
    id_ol_work
    id_ol_book
    isbn
    year_read 
    month_read 
    siblings {
      previous {
        slug
      }
      next {
        slug
      }
    }
  }
}`)

type Book = ExtractResultFieldTypeFor<typeof bookQuery, 'book'>

interface BookPageProps {
  book: Book
}

export async function getStaticProps({
  params,
}: BookPageStaticParams): Promise<{ props: BookPageProps }> {
  const response = await localRequest().query({
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
            <BookCover backgroundImageUrl={`${config.HOST_PUBLIC}/images/covers/${book.slug}.jpg`}>
              <VisuallyHidden>{book.title}</VisuallyHidden>
            </BookCover>
            <Text as="p" css={{ textAlign: 'center', marginTop: 15 }}>
              read on {book.month_read}/{book.year_read}
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
              isbn: <a href={`https://openlibrary.org/works/${book.id_ol_work}`}>{book.isbn}</a>
            </Text>
            <br />
            <Text>published: {book.year_first_published}</Text>
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

async function getBooksForPage(take: number, page: number): Promise<string[]> {
  const response = await localRequest().query({
    query: booksSlugQuery,
    variables: { take, skip: page * take },
  })
  const slugs = response.data.books?.map((book) => book?.slug) || []
  return slugs.filter(Boolean) as string[]
}

async function getAllBookSlugs(): Promise<string[]> {
  const take = 100
  const slugs: string[] = []
  let getMoreBooks = true
  let page = 0

  while (getMoreBooks) {
    const pageSlugs = await getBooksForPage(take, page)

    if (pageSlugs.length) {
      slugs.push(...pageSlugs)
    }

    page += 1
    getMoreBooks = pageSlugs.length === take
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
