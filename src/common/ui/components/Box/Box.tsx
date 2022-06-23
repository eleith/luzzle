import * as React from 'react'
import clsx, { ClassValue } from 'clsx'

type HTMLProperties = Omit<React.AllHTMLAttributes<HTMLElement>, 'as' | 'className'>

type Props = HTMLProperties & {
  as?: React.ElementType
  className?: ClassValue
}

export const Box = React.forwardRef<HTMLElement, Props>(
  ({ as = 'div', className, ...props }: Props, ref) => {
    return React.createElement(as, {
      className: clsx(className),
      ...props,
      ref,
    })
  }
)

export type BoxProps = Parameters<typeof Box>[0]

Box.displayName = 'Box'
