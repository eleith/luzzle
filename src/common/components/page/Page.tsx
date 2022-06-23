import Meta, { MetaProps } from '@app/common/components/page/meta'
import Head from 'next/head'
import { Box } from '@app/common/ui/components/Box'

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
