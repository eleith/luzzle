import * as React from 'react'

type Props = {
  as?: React.ElementType
} & React.HTMLAttributes<HTMLElement>

export const Box = React.forwardRef<HTMLElement, Props>(({ as = 'div', ...props }, ref) => {
  return React.createElement(as, {
    ...props,
    ref,
  })
})

Box.displayName = 'Box'
