import { forwardRef, createElement, ElementType, HTMLAttributes } from 'react'

type Props = {
  as?: ElementType
} & HTMLAttributes<HTMLElement>

export const Box = forwardRef<HTMLElement, Props>(({ as = 'div', ...props }, ref) => {
  return createElement(as, {
    ...props,
    ref,
  })
})

Box.displayName = 'Box'
