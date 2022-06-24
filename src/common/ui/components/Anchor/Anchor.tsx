import * as React from 'react'
import * as styles from './styles.css'
import { Box } from '../Box'
import clsx, { ClassValue } from 'clsx'

type WithAnchor = {
  as?: 'a'
} & Omit<React.AllHTMLAttributes<HTMLAnchorElement>, 'as' | 'className'>

type WithoutAnchor = {
  as: 'span'
} & Omit<React.AllHTMLAttributes<HTMLSpanElement>, 'as' | 'className'>

type Props = {
  as?: 'a' | 'span'
  children?: React.ReactNode
  className?: ClassValue
} & styles.AnchorVariants &
  (WithAnchor | WithoutAnchor)

export const Anchor = React.forwardRef(
  (
    { as = 'a', children, className, color, hoverAction, ...props }: Props,
    ref: React.Ref<HTMLAnchorElement> | React.Ref<HTMLSpanElement>
  ) => {
    const variantClass = styles.variants({ color, hoverAction })
    return (
      <Box className={clsx(variantClass, className) || undefined} ref={ref} as={as} {...props}>
        {children}
      </Box>
    )
  }
)

Anchor.displayName = 'Anchor'
