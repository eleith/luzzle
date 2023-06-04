import { MetaProps } from '@app/common/components/layout/meta'
import { Box } from '@luzzle/ui/components'
import Page from './Page'
import PageBannerSlide from './PageBannerSlide'

interface PageProps {
  meta: MetaProps
  children: React.ReactNode
  isHome?: boolean
  invert?: boolean
}

export default function PageFull({
  meta,
  children,
  isHome = false,
  invert = false,
}: PageProps): JSX.Element {
  return (
    <Page meta={meta}>
      <PageBannerSlide isHome={isHome} invert={invert} />
      <Box>{children}</Box>
    </Page>
  )
}
