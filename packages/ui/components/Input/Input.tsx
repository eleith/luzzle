import clsx from 'clsx'
import * as React from 'react'
import * as styles from './styles.css'
import {
  FormInput as AriaFormInput,
  FormLabel as AriaFormLabel,
  FormError as AriaFormError,
  FormInputProps as AriaFormInputProps,
  FormDescription as AriaFormDescription,
} from 'ariakit/form'
import { useState } from 'react'
import { Box } from '../Box'

type Props = {
  label?: string
  description?: string
  error?: string
  type?:
    | 'text'
    | 'password'
    | 'email'
    | 'number'
    | 'tel'
    | 'url'
    | 'search'
    | 'date'
    | 'time'
    | 'datetime-local'
    | 'month'
    | 'week'
    | 'color'
    | 'range'
    | 'hidden'
} & Omit<AriaFormInputProps<'input'>, 'size'> &
  React.HTMLAttributes<HTMLInputElement> &
  NonNullable<styles.InputVariants> &
  NonNullable<styles.InputTextVariants>

export const Input = React.forwardRef<HTMLInputElement, Props>(
  (
    {
      className,
      type = 'text',
      name,
      label,
      size,
      required,
      disabled,
      placeholder,
      description = '\u00A0',
      error,
      ...props
    },
    ref
  ) => {
    const [highlight, setHighlight] = useState(false)
    const classVariant = styles.variants()
    const invalid = !!error

    const descriptionElement = description && (
      <AriaFormDescription name={name} className={styles.description}>
        {description}
      </AriaFormDescription>
    )

    const errorElement = error && (
      <AriaFormError name={name} className={styles.error}>
        {error}
      </AriaFormError>
    )

    const labelElement = label && (
      <Box id={label} className={styles.label}>
        {label}
      </Box>
    )

    const highlightElement = highlight && <span className={styles.highlight} />

    return (
      <Box data-invalid={invalid || undefined} data-disabled={disabled || undefined}>
        <AriaFormLabel
          onMouseEnter={() => !disabled && setHighlight(true)}
          onMouseLeave={() => !disabled && setHighlight(false)}
          name={name}
          className={clsx(className, classVariant) || undefined}
        >
          {labelElement}
          {highlightElement}
          <AriaFormInput
            name={name}
            type={type}
            required={required}
            placeholder={placeholder}
            className={styles.inputVariants({ size })}
            aria-labelledby={label}
            disabled={disabled || undefined}
            {...props}
            ref={ref}
          />
        </AriaFormLabel>
        <Box className={styles.helper}>{errorElement || descriptionElement}</Box>
      </Box>
    )
  }
)

Input.displayName = 'Input'
