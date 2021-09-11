import Head from 'next/head'
import { ResultOf } from '@graphql-typed-document-node/core'
import { gql } from '@app/gql'
import request from '@app/lib/graphql/request'

const booksQuery = gql(`query getBooks {
  books {
    id
    title
    coauthors
    description
    author
    isbn
    subtitle
    year_first_published
  }
}`)

type BooksQueryResult = ResultOf<typeof booksQuery>
type ArrayElementType<T> = T extends (infer R)[] ? R : T
type Book = NonNullable<ArrayElementType<BooksQueryResult['books']>>
type HomeProps = { books: Book[] }

export async function getStaticProps(): Promise<{ props: HomeProps }> {
  const data = await request<BooksQueryResult>(booksQuery)
  return {
    props: { books: (data?.books as Book[]) || [] },
  }
}

export default function Home({ books }: HomeProps): JSX.Element {
  return (
    <>
      <Head>
        <title>Home</title>
      </Head>
      <div>
        {books
          .filter((x): x is Book => !!x)
          .map((book) => (
            <div key={book.id}>{book.title}</div>
          ))}
      </div>
    </>
  )
}
