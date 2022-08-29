import PageFull from '@app/common/components/page/PageFull'
import bookFragment from '@app/common/graphql/book/fragments/bookFullDetails'
import { GetStaticPathsResult } from 'next'
import Link from 'next/link'
import gql from '@app/lib/graphql/tag'
import {
  GetPartialBooksDocument,
  GetBookBySlugDocument,
  CreateBookDiscussionDocument,
} from './_gql_/[slug]'
import { BookCoverFor } from '@app/common/components/books'
import staticClient from '@app/common/graphql/staticClient'
import {
  Box,
  Text,
  Anchor,
  Divider,
  Button,
  Input,
  TextArea,
  Select,
  SelectItem,
} from '@app/common/ui/components'
import { ResultOf } from '@graphql-typed-document-node/core'
import * as styles from './[slug].css'
import { CaretLeft, CaretRight } from 'phosphor-react'
import { useDialogState, Dialog, DialogHeading } from 'ariakit/dialog'
import { vars } from '@app/common/ui/css'
import config from '@app/common/config'
import { Form, FormState, useFormState } from 'ariakit/form'
import gqlFetch from '@app/common/graphql/fetch'

interface BookPageStaticParams {
  params: {
    slug: string
    readOrder: string
  }
}

const bookDiscussionMutation = gql<
  typeof CreateBookDiscussionDocument
>(`mutation CreateBookDiscussion($input: DiscussionInput!) {
  createBookDiscussion(input: $input) {
    __typename
    ... on Error {
      message
    }
    ... on ValidationError {
      fieldErrors {
        message
        path
      }
    }
    ... on MutationCreateBookDiscussionSuccess {
      data
    }
  }
}`)

const partialBooksQuery = gql<
  typeof GetPartialBooksDocument
>(`query GetPartialBooks($take: Int, $after: String) {
  books(take: $take, after: $after) {
    slug
    readOrder
  }
}`)

const bookQuery = gql<typeof GetBookBySlugDocument>(
  `query GetBookBySlug($slug: String!) {
  book(slug: $slug) {
    ...BookFullDetails,
    siblings {
      previous {
        slug
      }
      next {
        slug
      }
    }
  }
}`,
  bookFragment
)

type Book = NonNullable<ResultOf<typeof bookQuery>['book']>
type PartialBook = NonNullable<ResultOf<typeof partialBooksQuery>['books']>[number]

interface BookPageProps {
  book: Book
}

export async function getStaticProps({
  params,
}: BookPageStaticParams): Promise<{ props: BookPageProps }> {
  const response = await staticClient.query({
    query: bookQuery,
    variables: { slug: params.slug },
  })
  const book = response.data.book

  if (book) {
    return {
      props: {
        book,
      },
    }
  } else {
    throw `Error: book(slug=${params.slug}) not found`
  }
}

function makeBookDateString(book?: Book): string {
  const month = book && typeof book.monthRead === 'number' ? book.monthRead : '?'
  const year = book && typeof book.yearRead === 'number' ? book.yearRead : '?'

  return `${month} / ${year}`
}

function makeNextLink(book: Book): JSX.Element {
  if (book.siblings?.next) {
    return (
      <Link href={`/books/${book.siblings.next.slug}`} passHref>
        <Anchor>
          <CaretRight size={45} />
        </Anchor>
      </Link>
    )
  }

  return (
    <Anchor disabled>
      <CaretRight size={45} />
    </Anchor>
  )
}

function makePreviousLink(book: Book): JSX.Element {
  if (book.siblings?.previous) {
    return (
      <Link href={`/books/${book.siblings.previous.slug}`} passHref>
        <Anchor>
          <CaretLeft size={45} />
        </Anchor>
      </Link>
    )
  }

  return (
    <Anchor disabled>
      <CaretLeft size={45} />
    </Anchor>
  )
}

export default function BookPage({ book }: BookPageProps): JSX.Element {
  const dialog = useDialogState()
  const formState = useFormState({
    defaultValues: { topic: '', discussion: '', email: '' },
  })
  const coverUrl = `${config.HOST_STATIC}/images/covers/${book.slug}.jpg`

  formState.useSubmit(async () => {
    const { createBookDiscussion } = await gqlFetch(bookDiscussionMutation, {
      input: {
        discussion: formState.values.discussion,
        email: formState.values.email,
        topic: formState.values.topic,
        slug: book.slug,
      },
    })
    if (createBookDiscussion) {
      const type = createBookDiscussion.__typename
      if (type === 'MutationCreateBookDiscussionSuccess') {
        dialog.hide()
        formState.reset()
      } else if (type === 'Error') {
        // show error message...
      } else if (type === 'ValidationError') {
        const fieldErrors = createBookDiscussion.fieldErrors
        fieldErrors?.forEach((fieldError) => {
          const field = fieldError.path?.split('.').pop() || ''
          if (formState.names[field as keyof typeof formState.values]) {
            console.log(`setting error for ${field} with message ${fieldError.message}`)
            formState.setError(field, fieldError.message)
          }
        })
      }
    }
  })

  function getTouchedError<T>(form: FormState<T>, name: keyof T): string | undefined {
    const touched = form.getFieldTouched(name as string)
    const error = form.getError(name as string)

    if (touched && error) {
      return error
    } else {
      return undefined
    }
  }

  return (
    <PageFull meta={{ title: book.title, image: coverUrl }}>
      <Box>
        <Box>
          <Box className={styles.bookContainer}>
            <Box className={styles.bookNavigation}>{makePreviousLink(book)}</Box>
            <Box className={styles.bookDetails}>
              <Box className={styles.book}>
                <BookCoverFor
                  book={book}
                  hasCover={!!book.coverWidth}
                  rotateInteract={{ x: 0, y: -35 }}
                />
              </Box>
              <Divider />
              <Box>
                <Text as="h1">{book.title}</Text>
                {book.subtitle && <Text>{book.subtitle}</Text>}
                <Text>
                  by {book.author} {book.coauthors}
                </Text>
                <br />
                <Text>read on {makeBookDateString(book)}</Text>
                {book.idOlWork && book.isbn && (
                  <Text>
                    isbn{' '}
                    <Anchor href={`https://openlibrary.org/works/${book.idOlWork}`}>
                      {book.isbn}
                    </Anchor>
                  </Text>
                )}
                {book.yearFirstPublished && <Text>published in {book.yearFirstPublished}</Text>}
                <Text>{book.pages} pages</Text>
                <br />
                <Button onClick={dialog.toggle} raised use={'primary'}>
                  discuss
                </Button>
              </Box>
              <Box>
                <Dialog
                  state={dialog}
                  style={{
                    background: vars.colors.surface,
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                  }}
                >
                  <Box>
                    <Box
                      style={{
                        display: 'flex',
                        justifyContent: 'center',
                      }}
                    >
                      <Box>
                        <DialogHeading>discuss</DialogHeading>
                        <Form state={formState} resetOnSubmit={false}>
                          <Select
                            label={'topic'}
                            name={formState.names.topic}
                            state={formState}
                            value={formState.values.topic}
                            error={getTouchedError(formState, 'topic')}
                            disabled={formState.submitting}
                            required
                          >
                            <SelectItem value={''}>select a topic</SelectItem>
                            <SelectItem value={'recommendation'} display={'recommendation'}>
                              a related book recommendation
                            </SelectItem>
                            <SelectItem value={'reflection'} display={'positive reflection'}>
                              positive reflections about this book
                            </SelectItem>
                            <SelectItem
                              value={'reflection-critical'}
                              display={'critical reflection'}
                            >
                              critical reflections about this book
                            </SelectItem>
                          </Select>
                          <br />
                          <Input
                            required
                            name={formState.names.email}
                            disabled={formState.submitting}
                            label={'email'}
                            type={'email'}
                            pattern={'[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$'}
                            error={getTouchedError(formState, 'email')}
                          />
                          <br />
                          <TextArea
                            name={formState.names.discussion}
                            label={'discussion'}
                            required
                            error={getTouchedError(formState, 'discussion')}
                            maxLength={2048}
                            disabled={formState.submitting}
                          />
                          <br />
                          <Box style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Button
                              outlined
                              disabled={formState.submitting}
                              onClick={() => {
                                formState.reset()
                                dialog.hide()
                              }}
                            >
                              Cancel
                            </Button>
                            <Button type={'submit'} disabled={formState.submitting}>
                              Send
                            </Button>
                          </Box>
                        </Form>
                      </Box>
                    </Box>
                  </Box>
                </Dialog>
              </Box>
            </Box>
            <Box className={styles.bookNavigation}>{makeNextLink(book)}</Box>
          </Box>
        </Box>
      </Box>
    </PageFull>
  )
}

async function getBooksForPage(take: number, after?: string): Promise<PartialBook[]> {
  const response = await staticClient.query({
    query: partialBooksQuery,
    variables: { take, after },
  })
  const books = response.data.books?.filter(Boolean) || []
  const partialBooks = books.map((book) => ({ slug: book.slug, readOrder: book.readOrder }))

  return partialBooks
}

async function getAllBookSlugs(): Promise<string[]> {
  const take = 100
  const slugs: string[] = []

  let partialBooks = await getBooksForPage(take)
  slugs.push(...partialBooks.map((book) => book.slug))

  while (partialBooks.length === take) {
    const lastBook = partialBooks[partialBooks.length - 1].readOrder
    partialBooks = await getBooksForPage(take, lastBook)
    slugs.push(...partialBooks.map((book) => book.slug))
  }

  return slugs
}

export async function getStaticPaths(): Promise<GetStaticPathsResult> {
  const slugs = await getAllBookSlugs()

  return {
    paths: slugs.map((slug) => ({
      params: {
        slug,
      },
    })),
    fallback: false,
  }
}
