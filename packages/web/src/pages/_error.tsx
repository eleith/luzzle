import type { NextPageContext } from 'next'
import type { ErrorProps } from 'next/error'
import PageFull from '@app/common/components/layout/PageFull'
import { useRouter } from 'next/router'
import { Anchor, Box, Text } from '@app/common/ui/components'
import RecommendationForm from '@app/common/components/pages/book/RecommendationForm'
import { useState } from 'react'

function pageNotFound() {
  return (
    <Box style={{ display: 'flex', justifyContent: 'center' }}>
      <Box style={{ width: '80%', margin: 'auto' }}>
        <Text as={'h1'} size={'title'}>
          this page intentionally left blank
        </Text>
      </Box>
    </Box>
  )
}

function BookNotFound() {
  const [showForm, setShowForm] = useState(false)

  return (
    <Box style={{ display: 'flex', justifyContent: 'center' }}>
      <Box style={{ width: '80%', margin: 'auto' }}>
        {showForm ? (
          <RecommendationForm onClose={() => setShowForm(false)} />
        ) : (
          <Box>
            <Text as={'h1'} size={'h1'}>
              i haven&apos;t read the book you are looking for
            </Text>
            <Text as={'h2'} size={'h2'}>
              please consider sending me a{' '}
              <Anchor onClick={() => setShowForm(true)} hoverAction={'animateUnderline'}>
                recommendation
              </Anchor>
              ?
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  )
}

function unexpectedError() {
  return (
    <Box style={{ display: 'flex', justifyContent: 'center' }}>
      <Box style={{ width: '80%', margin: 'auto' }}>
        <Text as={'h1'} size={'title'}>
          silence. empty space. nothingness. an error occurs in the void. will it be fixed?
        </Text>
      </Box>
    </Box>
  )
}

function Error({ statusCode }: ErrorProps) {
  const router = useRouter()

  switch (statusCode) {
    case 404:
      if (router.asPath.startsWith('/books/')) {
        return <PageFull meta={{ title: 'not found' }}>{BookNotFound()}</PageFull>
      } else {
        return <PageFull meta={{ title: 'not found' }}>{pageNotFound()}</PageFull>
      }
    default:
      return <PageFull meta={{ title: 'error' }}>{unexpectedError()}</PageFull>
  }
}

Error.getInitialProps = async ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err?.statusCode || 404
  return { statusCode }
}

export default Error
