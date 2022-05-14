import { MetaProps } from '@app/common/components/meta'
import { Box } from '@app/common/components/ui/Box'
import Link from 'next/link'
import { useState } from 'react'
import { ArrowUp, Swap } from 'phosphor-react'
import Page from './Page'
import { Paragraph } from '../ui/Paragraph'
import { Container } from '../ui'
import PageBannerSlide from './PageBannerSlide'

interface PageProps {
  meta?: MetaProps
  children: React.ReactNode
  link: string
  markdown?: string
}

export default function PageMarkdown(props: PageProps): JSX.Element {
  const { meta, link, markdown, children } = props
  const [showMarkdown, setShowMarkdown] = useState(false)

  return (
    <Page meta={meta}>
      <PageBannerSlide>
        <Link href={link}>
          <a>
            <ArrowUp size={35} color={'#4f4f4f'} />
          </a>
        </Link>
        <Box css={{ cursor: 'pointer' }}>
          <Swap
            size={35}
            color={'#4f4f4f'}
            onClick={() => {
              setShowMarkdown(!showMarkdown)
            }}
          />
        </Box>
      </PageBannerSlide>
      <Container size={2}>
        <Box
          css={{
            display: showMarkdown ? 'none' : 'block',
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
          {children}
        </Box>
        <Paragraph
          as={'code'}
          size={'1'}
          css={{
            whiteSpace: 'pre-wrap',
            display: showMarkdown ? 'block' : 'none',
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
          {markdown}
        </Paragraph>
      </Container>
    </Page>
  )
}
