import * as React from 'react'
import * as styles from './styles.css'
import { Button as MaterialButton, ButtonProps } from '@rmwc/button'
import clsx, { ClassValue } from 'clsx'
import '@material/button/dist/mdc.button.css'
import '@material/ripple/dist/mdc.ripple.css'

type Props = {
  as?: undefined | 'a'
  children?: React.ReactNode
  className?: ClassValue
} & styles.ButtonVariants &
  ButtonProps

export const Button = React.forwardRef(
  (
    { as, children, size, type, buttonType, className, disabled, ...props }: Props,
    ref: React.Ref<HTMLButtonElement>
  ) => {
    const variantClass = styles.variants({
      disabled: disabled,
      size,
      type: type || as === 'a' ? 'link' : 'button',
      buttonType,
    })

    return (
      <MaterialButton
        ref={ref}
        className={clsx(className, variantClass) || undefined}
        as={as}
        {...props}
      >
        {children}
      </MaterialButton>
    )
  }
)

Button.displayName = 'Button'
