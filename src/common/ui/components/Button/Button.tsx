import * as React from 'react'
import * as styles from './styles.css'
import { Button as AriaButton } from 'ariakit/button'
import clsx, { ClassValue } from 'clsx'

type Props = {
  as?: 'a' | 'button'
  children?: React.ReactNode
  className?: ClassValue
} & styles.ButtonVariants &
  React.HTMLAttributes<HTMLButtonElement>

export const Button = React.forwardRef(
  (
    { as = 'button', children, size, type, className, raised, use, disabled, ...props }: Props,
    ref: React.Ref<HTMLButtonElement>
  ) => {
    const variantClass = styles.variants({
      disabled: disabled,
      size,
      type: type || as === 'a' ? 'link' : 'button',
      raised,
      use,
    })

    return (
      <AriaButton
        ref={ref}
        className={clsx(className, variantClass) || undefined}
        as={as}
        {...props}
      >
        <span className={styles.label}>{children}</span>
      </AriaButton>
    )
  }
)

Button.displayName = 'Button'
