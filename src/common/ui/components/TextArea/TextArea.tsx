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
  invalid?: boolean
  description?: string
  error?: string
} & NonNullable<styles.TextAreaVariants> &
  AriaFormInputProps<'textarea'> &
  React.HTMLAttributes<HTMLTextAreaElement>

export const TextArea = React.forwardRef<HTMLTextAreaElement, Props>(
  (
    {
      className,
      name,
      invalid = false,
      label,
      required,
      placeholder,
      value,
      description,
      error,
      rows = 2,
      cols = 24,
      ...props
    },
    ref
  ) => {
    const [highlight, setHighlight] = useState(false)
    const classVariant = styles.variants()

    const descriptionElement = description && (
      <AriaFormDescription name={name} className={styles.description}>
        ${description}
      </AriaFormDescription>
    )

    const errorElement = error && (
      <AriaFormError name={name} className={styles.error}>
        ${error}
      </AriaFormError>
    )
    const labelElement = label && (
      <Box id={label} className={styles.label}>
        {label}
      </Box>
    )
    const highlightElement = highlight && <span className={styles.highlight} />

    return (
      <Box data-invalid={invalid || undefined}>
        <AriaFormLabel
          onMouseEnter={() => setHighlight(true)}
          onMouseLeave={() => setHighlight(false)}
          name={name}
          className={clsx(className, classVariant) || undefined}
        >
          {labelElement}
          {highlightElement}
          <AriaFormInput
            name={name}
            as="textarea"
            ref={ref}
            rows={rows}
            cols={cols}
            required={required}
            placeholder={placeholder}
            className={styles.textArea}
            aria-labelledby={label}
            value={value}
            {...props}
          />
        </AriaFormLabel>
        <Box className={styles.helper}>
          {descriptionElement}
          {errorElement}
        </Box>
      </Box>
    )
  }
)

TextArea.displayName = 'TextArea'
