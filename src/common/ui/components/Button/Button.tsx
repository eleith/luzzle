import * as React from 'react'
import * as styles from './styles.css'
import { Button as AriaButton } from 'ariakit'
import clsx, { ClassValue } from 'clsx'

type WithAnchor = {
  as?: 'a'
} & Omit<React.HTMLAttributes<HTMLAnchorElement>, 'as' | 'className'>

type WithButton = {
  as?: 'button'
} & Omit<React.HTMLAttributes<HTMLButtonElement>, 'as' | 'className'>

type Props = {
  children?: React.ReactNode
  className?: ClassValue
} & styles.ButtonVariants &
  (WithAnchor | WithButton)

export const Button = React.forwardRef(
  (
    { as = 'button', children, size = 'large', type = 'primary', className, ...props }: Props,
    ref: React.Ref<HTMLButtonElement> | React.Ref<HTMLAnchorElement>
  ) => {
    const variantClass = styles.variants({
      disabled: props.disabled,
      size,
      type,
    })

    return (
      <AriaButton className={clsx(className, variantClass) || undefined} ref={ref} as={as} {...props}>
        {children}
      </AriaButton>
    )
  }
)

Button.displayName = 'Button'
