import Page from '@app/common/components/page'
import { Container, Grid, Box, Text, Paragraph, Heading } from 'theme-ui'
import { GetStaticPathsResult } from 'next'
import { gql } from '@app/gql'
import BookCover from '@app/common/components/books'
import localRequest from '@app/lib/graphql/localRequest'
import VisuallyHidden from '@reach/visually-hidden'
import { ExtractResultFieldTypeFor } from '@app/lib/graphql/types'

interface BookPageStaticParams {
  params: {
    slug: string
  }
}

const booksSlugQuery = gql(`query getBookSlugs($take: Int!) {
  books(take: $take) {
    slug
  }
}`)

const bookQuery = gql(`query getBookBySlug($slug: String!) {
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
        book: book,
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
          sx={{
            width: ['100%', '100%', '70%'],
            margin: 'auto',
            marginTop: '250px',
            gridTemplateColumns: ['1fr', '1fr 1fr', '1fr 1fr'],
            gridTemplateRows: ['fit-content fit-content', '1fr', '1fr'],
            gridAutoFlow: ['row', 'column', 'column'],
            justifyItems: 'center',
            alignItems: 'flex-start',
            gap: '20px',
          }}
        >
          <Box>
            <BookCover backgroundImageUrl={`/images/covers/${book.slug}.jpg`}>
              <VisuallyHidden>{book.title}</VisuallyHidden>
            </BookCover>
            <Paragraph sx={{ textAlign: 'center', marginTop: 15 }}>
              read on {book.month_read}/{book.year_read}
            </Paragraph>
          </Box>
          <Box>
            <Heading>{book.title}</Heading>
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
            <br />
            <br />
            <Paragraph>{book.description}</Paragraph>
          </Box>
        </Grid>
      </Container>
    </Page>
  )
}

export async function getStaticPaths(): Promise<GetStaticPathsResult> {
  const response = await localRequest().query({ query: booksSlugQuery, variables: { take: 500 } })
  const books = response.data.books
  const bookParams = books?.map((partialBook) => ({ params: { slug: partialBook?.slug } })) || []

  return {
    paths: bookParams,
    fallback: false,
  }
}
