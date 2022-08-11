import clsx from 'clsx'
import * as React from 'react'
import * as styles from './styles.css'
import {
  FormInput as AriaFormInput,
  FormLabel as AriaFormLabel,
  FormError as AriaFormError,
  FormInputProps as AriaFormInputProps,
} from 'ariakit/form'
import { Box } from '../Box'
import { useState } from 'react'

type Props = {
  children?: React.ReactNode
  label?: string
} & styles.FormInputVariants &
  AriaFormInputProps &
  React.HTMLAttributes<HTMLInputElement>

export const Input = React.forwardRef(
  (
    { className, name, label, required, placeholder, value, ...props }: Props,
    ref: React.Ref<HTMLInputElement>
  ) => {
    const [highlight, setHighlight] = useState(false)
    const classVariant = styles.variants({ hasLabel: !!label })

    return (
      <>
        <AriaFormLabel
          onMouseEnter={() => setHighlight(true)}
          onMouseLeave={() => setHighlight(false)}
          name={name}
          className={clsx(className, classVariant) || undefined}
        >
          {label && (
            <span id="label" className={styles.label}>
              {label}
            </span>
          )}
          <span className={highlight ? styles.highlight : ''} />
          <AriaFormInput
            name={name}
            ref={ref}
            required={required}
            placeholder={placeholder}
            className={label ? styles.inputWithLabel : styles.input}
            aria-labelledby={label}
            value={value}
            {...props}
          />
        </AriaFormLabel>
        <Box>
          <AriaFormError name={name} />
        </Box>
      </>
    )
  }
)

Input.displayName = 'Input'
