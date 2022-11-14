import { MetaProps } from '@app/common/components/layout/meta'
import { Box } from '@luzzle/ui/components'
import Page from './Page'
import PageBannerSlide from './PageBannerSlide'

interface PageProps {
  meta: MetaProps
  children: React.ReactNode
  isHome?: boolean
}

export default function PageMarkdown({ meta, children, isHome = false }: PageProps): JSX.Element {
  return (
    <Page meta={meta}>
      <PageBannerSlide isHome={isHome} />
      <Box>{children}</Box>
    </Page>
  )
}
