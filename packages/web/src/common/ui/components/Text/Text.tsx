import clsx, { ClassValue } from 'clsx'
import * as React from 'react'
import { Box } from '../Box'
import * as styles from './styles.css'

type WithDiv = {
  as?: 'div'
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'as' | 'className'>

type WithSpan = {
  as?: 'span'
} & Omit<React.HTMLAttributes<HTMLSpanElement>, 'as' | 'className'>

type WithHeading = {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
} & Omit<React.HTMLAttributes<HTMLHeadingElement>, 'as' | 'className'>

type WithLabel = {
  as?: 'label'
} & Omit<React.HTMLAttributes<HTMLLabelElement>, 'as' | 'className'>

type WithParagraph = {
  as?: 'p'
} & Omit<React.HTMLAttributes<HTMLParagraphElement>, 'as' | 'className'>

type WithCode = {
  as?: 'code'
} & Omit<React.HTMLAttributes<HTMLElement>, 'as' | 'className'>

type Props = {
  children?: React.ReactNode
  className?: ClassValue
} & styles.TextVariants &
  (WithDiv | WithSpan | WithHeading | WithLabel | WithParagraph | WithCode)

export const Text = React.forwardRef(
  (
    { as = 'div', className, children, ellipsis, size, ...props }: Props,
    ref: React.Ref<HTMLElement>
  ) => {
    const defaultSizes: Record<typeof as, styles.TextSizes> = {
      h1: 'h1',
      h2: 'h2',
      h3: 'h3',
      h4: 'body',
      h5: 'body',
      h6: 'body',
      label: 'label',
      code: 'body',
      p: 'body',
      span: 'body',
      div: 'body',
    }

    const classVariant = styles.variants({
      size: size || defaultSizes[as],
      ellipsis: ellipsis ? true : undefined,
    })

    return (
      <Box as={as} className={clsx(classVariant, className)} ref={ref} {...props}>
        {children}
      </Box>
    )
  }
)

Text.displayName = 'Text'
