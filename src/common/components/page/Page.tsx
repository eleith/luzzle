import Meta, { MetaProps } from '@app/common/components/page/meta'
import { Box } from '@app/common/ui/components/Box'

interface PageProps {
  meta: MetaProps
  children?: React.ReactNode
}

export default function Page(props: PageProps): JSX.Element {
  return (
    <>
      <Meta {...props.meta} />
      <Box>{props.children}</Box>
    </>
  )
}
