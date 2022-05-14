import { MetaProps } from '@app/common/components/meta'
import { Box } from '@app/common/components/ui/Box'
import Page from './Page'
import PageBannerSlide from './PageBannerSlide'

interface PageProps {
  meta?: MetaProps
  children: React.ReactNode
}

export default function PageMarkdown(props: PageProps): JSX.Element {
  const { meta, children } = props

  return (
    <Page meta={meta}>
      <PageBannerSlide />
      <Box>{children}</Box>
    </Page>
  )
}
