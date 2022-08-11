import * as React from 'react'
import * as styles from './styles.css'
import { Separator, SeparatorProps } from 'ariakit'
import clsx, { ClassValue } from 'clsx'

type Props = {
  className?: ClassValue
} & styles.Variants &
  SeparatorProps

export const Divider = React.forwardRef(
  ({ className, ...props }: Props, ref: React.Ref<HTMLHRElement>) => {
    const classVariant = styles.variants({})
    return <Separator className={clsx(classVariant, className) || undefined} ref={ref} {...props} />
  }
)

Divider.displayName = 'Divider'
