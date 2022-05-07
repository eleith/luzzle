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
import { FileArrowDown, FileArrowUp, FileCode } from 'phosphor-react'
import { useState } from 'react'
import { Paragraph } from '@app/common/components/ui/Paragraph'
import { Flex } from '@app/common/components/ui/Flex'
import Link from 'next/link'

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

export default function HomeMd({ book1, book2, markdown }: HomePageProps): JSX.Element {
  const homePage = <Index components={components} book1={book1} book2={book2} />
  const [view, setView] = useState<'html' | 'md'>('html')

  const html = (
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
      {view === 'html' ? homePage : markdown}
    </Box>
  )
  const md = (
    <Paragraph as={'code'} size={'1'} css={{ whiteSpace: 'pre-wrap' }}>
      {markdown}
    </Paragraph>
  )

  return (
    <Page meta={{ title: '' }}>
      <Flex justify={'end'}>
        <Link href="/">
          <a>
            <FileArrowUp size={50} color={'#6f6f6f'} />
          </a>
        </Link>
        <Box css={{ cursor: view === 'html' ? 'default' : 'pointer' }}>
          <FileArrowDown
            size={50}
            color={view === 'html' ? '#cfcfcf' : '#6f6f6f'}
            onClick={() => {
              setView('html')
            }}
          />
        </Box>
        <Box css={{ cursor: view === 'html' ? 'pointer' : 'default' }}>
          <FileCode
            size={50}
            color={view === 'html' ? '#1f1f1f' : '#cfcfcf'}
            onClick={() => {
              setView('md')
            }}
          />
        </Box>
      </Flex>
      <Container size={2}>{view === 'html' ? html : md}</Container>
    </Page>
  )
}
