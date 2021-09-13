import Meta, { MetaProps } from '@app/common/components/meta'
import Head from 'next/head'
import { Box } from 'theme-ui'

interface PageProps {
  meta?: MetaProps
  children?: React.ReactNode
}

export default function Page(props: PageProps): JSX.Element {
  return (
    <>
      <Head>
        <Meta {...props.meta} />
      </Head>
      <Box>{props.children}</Box>
    </>
  )
}
