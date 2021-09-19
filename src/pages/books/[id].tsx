import Page from '@app/common/components/page'
import { Container } from 'theme-ui'
import { GetStaticPathsResult } from 'next'
import { gql } from '@app/gql'
import { getBookSize, makeBook, getCoverPath } from '@app/common/components/books'
import { Box } from 'theme-ui'
import Link from 'next/link'
import request, { ExtractResultFieldTypeFor } from '@app/lib/graphql/request'

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
  const data = await request(bookQuery, { id: params.id })

  if (data.book) {
    return {
      props: {
        book: data.book,
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
      <Container sx={{ width: '70%' }}>{bookBox}</Container>
    </Page>
  )
}

export async function getStaticPaths(): Promise<GetStaticPathsResult> {
  const data = await request(booksIdQuery)
  const bookParams = data.books?.map((partialBook) => ({ params: { id: partialBook?.id } })) || []

  return {
    paths: bookParams,
    fallback: false,
  }
}
