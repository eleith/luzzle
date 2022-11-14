import Meta, { MetaProps } from '@app/common/components/layout/meta'
import { Box } from '@luzzle/ui/components/Box'

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
