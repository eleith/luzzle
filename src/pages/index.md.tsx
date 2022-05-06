import Page from '@app/common/components/page'
import bookFragment from '@app/common/graphql/book/fragments/bookFullDetails'
import gql from '@app/lib/graphql/tag'
import { GetBookHomeMdDocument } from './_gql_/index.md'
import staticClient from '@app/common/graphql/staticClient'
import { Container } from '@app/common/components/ui/Container'
import { ResultOf } from '@graphql-typed-document-node/core'
import Index from '@app/pages-md/index.mdx'
import { Box } from '@app/common/components/ui'
import { jsx2md } from '@app/lib/markdown'
import components from '@app/common/components/mdx/components'

const getBooksQuery = gql<typeof GetBookHomeMdDocument>(
  `query GetBookHomeMd($take: Int) {
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
  markdown: string
}

export async function getStaticProps(): Promise<{ props: HomePageProps }> {
  const response = await staticClient.query({ query: getBooksQuery, variables: { take: 2 } })
  const books = response.data?.books
  const nonExistantBook = { title: 'a title', id: 'add-more-books' } as Book
  const homePage = <Index book1={books?.[0]} book2={books?.[1]} components={components} />
  const markdown = await jsx2md(homePage)

  return {
    props: {
      book1: books?.[0] || nonExistantBook,
      book2: books?.[1] || nonExistantBook,
      markdown,
    },
  }
}

export default function HomeMd({ book1, book2 }: HomePageProps): JSX.Element {
  const homePage = <Index components={components} book1={book1} book2={book2} />

  return (
    <Page meta={{ title: '' }}>
      <Container size={2}>
        <Box
          css={{
            width: '100%',
            margin: 'auto',
            marginTop: '20px',
            '@tablet': {
              width: '100%',
              margin: 'auto',
              marginTop: '50px',
            },
            '@desktop': {
              width: '70%',
              margin: 'auto',
              marginTop: '50px',
            },
          }}
        >
          {homePage}
        </Box>
      </Container>
    </Page>
  )
}
