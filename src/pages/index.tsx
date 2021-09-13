import { ResultOf } from '@graphql-typed-document-node/core'
import { gql } from '@app/gql'
import request from '@app/lib/graphql/request'
import Page from '@app/common/components/page'
import { Card, Container, Flex, Image, Box, Text } from 'theme-ui'

const booksQuery = gql(`query getBooks {
  books {
    id
    id_cover_image
    title
    coauthors
    description
    author
    isbn
    subtitle
    year_first_published
  }
}`)

function getCoverPath(id: string): string {
  const folder1 = id.substr(-2)
  const folder2 = id.substr(-4, 2)
  return `/images/covers/${folder1}/${folder2}/${id}.jpg`
}

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
    <Page meta={{ title: 'home' }}>
      <Container sx={{ width: [null, '75%', '50%'] }}>
        <Flex
          sx={{
            flexDirection: 'column',
            justifyContent: 'center',
            height: '100vh',
            minHeight: 'fill-available',
          }}
        >
          {books?.length && (
            <Card key={books[0].id}>
              <Flex sx={{ flexDirection: ['column', 'row', 'row'] }}>
                <Image
                  alt="book cover art for x"
                  src={`${getCoverPath(books[0].id_cover_image || '')}`}
                  width="50%"
                />
                <Box>
                  <Text>{books[0].title}</Text>
                </Box>
              </Flex>
            </Card>
          )}
        </Flex>
      </Container>
    </Page>
  )
}
