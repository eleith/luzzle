import Page from '@app/common/components/page'
import { Container } from 'theme-ui'
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
    <Page meta={{ title: 'home' }}>
      <Container sx={{ width: 'fit-content' }}>
        <BookCover backgroundImageUrl={`/images/covers/${book.slug}.jpg`}>
          <VisuallyHidden>{book.title}</VisuallyHidden>
        </BookCover>
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
