import * as React from 'react'
import * as styles from './styles.css'
import {
  Tooltip as AriaTooltip,
  TooltipProps as AriaTooltipProps,
  TooltipAnchorProps as AriaTooltipAnchorProps,
  TooltipAnchor as AriaTooltipAnchor,
  useTooltipState as useAriaTooltipState,
} from 'ariakit/tooltip'
import clsx from 'clsx'

type Props = {
  children?: React.ReactNode
} & AriaTooltipProps &
  styles.TooltipVariants &
  React.HTMLAttributes<HTMLDivElement>

type AnchorProps = {
  as?: string
  children?: React.ReactNode
} & AriaTooltipAnchorProps

export const Tooltip = React.forwardRef(
  (
    { children, outlined, className, raised, use, ...props }: Props,
    ref: React.Ref<HTMLDivElement>
  ) => {
    const variantClass = styles.variants({
      raised,
      outlined,
      use,
    })

    return (
      <AriaTooltip ref={ref} className={clsx(className, variantClass) || undefined} {...props}>
        {children}
      </AriaTooltip>
    )
  }
)

Tooltip.displayName = 'Tooltip'

export const TooltipAnchor = function ({ as = 'div', children, className, ...props }: AnchorProps) {
  const variantClass = styles.variants({})

  return (
    <AriaTooltipAnchor as={as} className={clsx(className, variantClass) || undefined} {...props}>
      {children}
    </AriaTooltipAnchor>
  )
}

TooltipAnchor.displayName = 'TooltipAnchor'

export const useTooltipState = useAriaTooltipState
