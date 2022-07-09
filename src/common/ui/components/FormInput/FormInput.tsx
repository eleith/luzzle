import clsx, { ClassValue } from 'clsx'
import * as React from 'react'
import * as styles from './styles.css'
import { FormInput as AriaFormInput, FormError, FormDescription } from 'ariakit/form'
import { StringLike } from 'ariakit/ts/form/__utils'
import { Box } from '../Box'
import { Text } from '../Text'

type WithInput = {
  as?: 'input' | 'textarea'
} & Omit<React.HTMLAttributes<HTMLInputElement>, 'as' | 'className'>

type Props = {
  children?: React.ReactNode
  className?: ClassValue
  name: StringLike
} & styles.FormInputVariants &
  WithInput

export const FormInput = React.forwardRef(
  (
    { as = 'input', className, children, name, size, ...props }: Props,
    ref: React.Ref<HTMLInputElement>
  ) => {
    const classVariant = styles.variants({ size })

    return (
      <Box className={clsx(classVariant, className)}>
        <Box className={styles.inputContainer}>
          <Text className={styles.inputLabel}>label</Text>
          <AriaFormInput as={as} name={name} ref={ref} {...props} className={styles.resetInput}>
            {children}
          </AriaFormInput>
        </Box>

        <Box>
          <FormError name={name}>label</FormError>
        </Box>

        <Box>
          <FormDescription name={name}>helper text</FormDescription>
        </Box>
      </Box>
    )
  }
)

FormInput.displayName = 'FormInput'
