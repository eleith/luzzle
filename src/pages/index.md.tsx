import Page from '@app/common/components/page'
import bookFragment from '@app/common/graphql/book/fragments/bookFullDetails'
import gql from '@app/lib/graphql/tag'
import { GetBookHomeMdDocument } from './_gql_/index.md'
import staticClient from '@app/common/graphql/staticClient'
import { Container } from '@app/common/components/ui/Container'
import { ResultOf } from '@graphql-typed-document-node/core'
import Index from '@app/pages-md/index.mdx'
import * as ReactDOMServer from 'react-dom/server'
import { unified } from 'unified'
import rehypeParse from 'rehype-parse'
import rehypeRemark from 'rehype-remark'
import remarkStringify from 'remark-stringify'
import { Box } from '@app/common/components/ui'
import Link from 'next/link'
import { MDXComponents } from 'mdx/types'
import { Heading, HeadingSizeVariants } from '@app/common/components/ui/Heading'
import { Paragraph } from '@app/common/components/ui/Paragraph'

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
  const homePage = <Index book1={books?.[0]} book2={books?.[1]} />
  const htmlString = ReactDOMServer.renderToStaticMarkup(homePage)

  const markdown = await unified()
    .use(rehypeParse)
    .use(rehypeRemark)
    .use(remarkStringify)
    .process(htmlString)

  return {
    props: {
      book1: books?.[0] || nonExistantBook,
      book2: books?.[1] || nonExistantBook,
      markdown: markdown.toString(),
    },
  }
}

const components: MDXComponents = {
  h1: (props) => <Heading size={'4'}>{props.children}</Heading>,
  h2: (props) => (
    <Heading as={'h2'} size={'3'}>
      {props.children}
    </Heading>
  ),
  h3: (props) => (
    <Heading as={'h3'} size={'2'}>
      {props.children}
    </Heading>
  ),
  h4: (props) => (
    <Heading as={'h4'} size={'1'}>
      {props.children}
    </Heading>
  ),
  h5: (props) => (
    <Heading as={'h5'} size={'1'}>
      {props.children}
    </Heading>
  ),
  p: (props) => <Paragraph>{props.children}</Paragraph>,
  a: (props) => {
    if (props.href) {
      return (
        <Link href={props.href}>
          <a {...props}>{props.children}</a>
        </Link>
      )
    }
    return (
      <a target="_blank" rel="noopener noreferrer" {...props}>
        {props.children}
      </a>
    )
  },
}

export default function Home({ book1, book2, markdown }: HomePageProps): JSX.Element {
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
