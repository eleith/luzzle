import Head from 'next/head'
import { request } from 'graphql-request'
import useSWR from 'swr'
import { TypedDocumentNode, ResultOf } from '@graphql-typed-document-node/core'
import { print } from 'graphql'
import { gql } from '@app/gql'

const API_ENDPOINT = 'http://localhost:3000/api/graphql'
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

type Books = ResultOf<typeof booksQuery>
type ArrayElementType<T> = T extends (infer R)[] ? R : T
type Book = NonNullable<ArrayElementType<Books['books']>>

export default function Home(): JSX.Element {
  const fetcher = (query: TypedDocumentNode): Promise<Books> => request(API_ENDPOINT, query)
  const { data } = useSWR<Books>(print(booksQuery), fetcher)

  return (
    <>
      <Head>
        <title>Home</title>
      </Head>
      <div>
        {data?.books
          ?.filter((x): x is Book => !!x)
          .map((book) => (
            <div key={book.id}>{book.title}</div>
          ))}
      </div>
    </>
  )
}
