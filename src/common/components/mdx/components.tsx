import { MDXComponents } from 'mdx/types'
import { Heading } from '@app/common/components/ui/Heading'
import { Paragraph } from '@app/common/components/ui/Paragraph'
import Link from 'next/link'

const components: MDXComponents = {
  h1: (props) => <Heading size={'4'}>{props.children}</Heading>,
  h2: (props) => (
    <Heading as={'h2'} size={'3'}>
      {props.children}
    </Heading>
  ),
  h3: (props) => (
    <Heading as={'h3'} size={'2'}>
      {props.children}
    </Heading>
  ),
  h4: (props) => (
    <Heading as={'h4'} size={'1'}>
      {props.children}
    </Heading>
  ),
  h5: (props) => (
    <Heading as={'h5'} size={'1'}>
      {props.children}
    </Heading>
  ),
  p: (props) => <Paragraph>{props.children}</Paragraph>,
  a: (props) => {
    if (props.href) {
      return (
        <Link href={props.href}>
          <a {...props}>{props.children}</a>
        </Link>
      )
    }
    return (
      <a target="_blank" rel="noopener noreferrer" {...props}>
        {props.children}
      </a>
    )
  },
}

export default components
