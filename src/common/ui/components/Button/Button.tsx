import * as React from 'react'
import * as styles from './styles.css'
import { Button as AriaButton, ButtonProps as AriaButtonProps } from 'ariakit/button'
import clsx from 'clsx'

type AnchorProps = {
  as: 'a'
  children?: React.ReactNode
} & React.HTMLAttributes<HTMLAnchorElement>

type ButtonProps = {
  as?: 'button'
  children?: React.ReactNode
} & React.HTMLAttributes<HTMLButtonElement>

type Props = {
  as?: 'a' | 'button'
  children?: React.ReactNode
} & AriaButtonProps &
  styles.ButtonVariants &
  (AnchorProps | ButtonProps)

export const Button = React.forwardRef(
  (
    {
      as = 'button',
      children,
      outlined,
      className,
      raised,
      use,
      disabled,
      action,
      ...props
    }: Props,
    ref: React.Ref<HTMLButtonElement>
  ) => {
    const variantClass = styles.variants({
      as,
      raised,
      outlined,
      use,
      action,
    })

    return (
      <AriaButton
        ref={ref}
        className={clsx(className, variantClass) || undefined}
        as={as}
        disabled={disabled || undefined}
        {...props}
      >
        <span className={styles.label}>{children}</span>
      </AriaButton>
    )
  }
)

Button.displayName = 'Button'
