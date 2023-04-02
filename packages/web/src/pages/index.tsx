import PageFull from '@app/common/components/layout/PageFull'
import bookFragment from '@app/common/graphql/book/fragments/bookFullDetails'
import gql from '@app/lib/graphql/tag'
import { GetBookHomeDocument } from './_gql_/index'
import staticClient from '@app/common/graphql/staticClient'
import Link from 'next/link'
import { Box, Text, Anchor } from '@luzzle/ui/components'
import { ResultOf } from '@graphql-typed-document-node/core'
import * as styles from './index.css'

const getBooksQuery = gql<typeof GetBookHomeDocument>(
  `query GetBookHome($take: Int) {
  books(take: $take) {
    ...BookFullDetails
  }
}`,
  bookFragment
)

type Book = NonNullable<ResultOf<typeof getBooksQuery>['books']>[number]

type HomePageProps = {
  book1: Book
  book2: Book
}

function makeLink(text: string, href: string) {
  return (
    <Link href={href} passHref>
      <Anchor hoverAction="animateUnderline">{text}</Anchor>
    </Link>
  )
}

export async function getStaticProps(): Promise<{ props: HomePageProps }> {
  const response = await staticClient.query({ query: getBooksQuery, variables: { take: 2 } })
  const books = response.data?.books
  const nonExistantBook = { title: 'a title', id: 'add-more-books' } as Book

  return {
    props: {
      book1: books?.[0] || nonExistantBook,
      book2: books?.[1] || nonExistantBook,
    },
  }
}

export default function Home({ book1, book2 }: HomePageProps): JSX.Element {
  return (
    <PageFull meta={{ title: 'books' }} isHome>
      <Box className={styles.page}>
        <Box>
          <Text as="h1" size={'title'}>
            hello
          </Text>
          <br />
          <Text as="h2" size={'h1'}>
            this site allows me to recall and share {makeLink('books', '/books')} i&apos;ve read.{' '}
          </Text>
          <br />
          <Text as="h3" size={'h1'}>
            the last two i&apos;ve read are {makeLink(book1.title, `/books/${book1.slug}`)} and{' '}
            {makeLink(book2.title, `/books/${book2.slug}`)}
          </Text>
        </Box>
      </Box>
    </PageFull>
  )
}

// https://nextjs.org/docs/advanced-features/output-file-tracing#caveats
export const config = {
  unstable_includeFiles: ['prisma/data/*'],
}
