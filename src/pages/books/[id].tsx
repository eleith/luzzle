import Page from '@app/common/components/page'
import { Container } from 'theme-ui'
import { GetStaticPathsResult } from 'next'
import { gql } from '@app/gql'
import { getBookSize, makeBook, getCoverPath } from '@app/common/components/books'
import { Box } from 'theme-ui'
import Link from 'next/link'
import { ExtractResultFieldTypeFor } from '@app/lib/graphql/request'
import localRequest from '@app/lib/graphql/localRequest'

interface BookPageStaticParams {
  params: {
    id: string
  }
}

const booksIdQuery = gql(`query getBookIds {
  books {
    id
  }
}`)

const bookQuery = gql(`query getBookById($id: String!) {
  book(id: $id) {
    id
    id_cover_image
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
  const response = await localRequest.query({ query: bookQuery, variables: { id: params.id } })
  const book = response.data.book

  if (book) {
    return {
      props: {
        book: book,
      },
    }
  } else {
    throw `Error: book(id=${params.id}) not found`
  }
}

export default function BookPage({ book }: BookPageProps): JSX.Element {
  const coverUrl = book.id_cover_image ? getCoverPath(book.id_cover_image) : undefined
  const cover = makeBook(getBookSize(book.pages || 200), coverUrl)

  const bookBox = (
    <Box key={book.id} sx={{ position: 'relative' }}>
      <Link href={`/books/${book.id}`}>{cover}</Link>
    </Box>
  )
  return (
    <Page meta={{ title: 'home' }}>
      <Container sx={{ width: 'fit-content' }}>{bookBox}</Container>
    </Page>
  )
}

export async function getStaticPaths(): Promise<GetStaticPathsResult> {
  const response = await localRequest.query({ query: booksIdQuery })
  const books = response.data.books
  const bookParams = books?.map((partialBook) => ({ params: { id: partialBook?.id } })) || []

  return {
    paths: bookParams,
    fallback: false,
  }
}
