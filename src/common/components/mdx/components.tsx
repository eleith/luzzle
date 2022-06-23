import { MDXComponents } from 'mdx/types'
import { Text } from '@app/common/ui/components'
import Link from 'next/link'

const components: MDXComponents = {
  h1: (props) => <Text as={'h1'}>{props.children}</Text>,
  h2: (props) => (
    <Text as={'h2'}>
      {props.children}
    </Text>
  ),
  h3: (props) => (
    <Text as={'h3'}>
      {props.children}
    </Text>
  ),
  h4: (props) => (
    <Text as={'h4'}>
      {props.children}
    </Text>
  ),
  h5: (props) => (
    <Text as={'h5'}>
      {props.children}
    </Text>
  ),
  p: (props) => <Text>{props.children}</Text>,
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
