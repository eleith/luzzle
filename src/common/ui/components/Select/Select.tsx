import clsx, { ClassValue } from 'clsx'
import * as React from 'react'
import * as styles from './styles.css'
import {
  Select as AriaSelect,
  SelectItem as AriaSelectItem,
  SelectArrow,
  SelectPopover,
  useSelectState,
  SelectProps,
} from 'ariakit/select'
import {
  FormLabel as AriaFormLabel,
  FormError as AriaFormError,
  FormDescription as AriaFormDescription,
} from 'ariakit/form'
import { Box } from '../Box'
import { useState } from 'react'

type Props = {
  children: React.ReactNode
  value?: string
  label?: string
  name: string
  setValue?: (value: string) => void
  defaultValue?: string
  required?: boolean
  description?: string
  error?: string
  invalid?: boolean
} & NonNullable<styles.SelectVariants> &
  Omit<SelectProps, 'state'> &
  React.HTMLAttributes<HTMLButtonElement>

export const Select = React.forwardRef<HTMLButtonElement, Props>(
  (
    {
      children,
      value,
      label,
      name,
      setValue,
      defaultValue,
      className,
      description,
      error,
      invalid = false,
      ...props
    },
    ref
  ) => {
    const boxRef = React.useRef<HTMLDivElement>(null)
    const [highlight, setHighlight] = useState(false)
    const select = useSelectState({
      value,
      setValue,
      sameWidth: true,
      getAnchorRect: () => boxRef.current?.getBoundingClientRect() || null,
      defaultValue,
    })
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
      <AriaFormLabel id={name} className={styles.label} name={name}>
        {label}
      </AriaFormLabel>
    )

    const highlightElement = highlight && <span className={styles.highlight} />

    return (
      <Box
        className={clsx(className, classVariant) || undefined}
        onMouseEnter={() => setHighlight(true)}
        onMouseLeave={() => setHighlight(false)}
        ref={boxRef}
        data-invalid={invalid}
      >
        {labelElement}
        {highlightElement}
        <AriaSelect
          state={select}
          as={'button'}
          ref={ref}
          name={name}
          className={styles.select}
          {...props}
        >
          {select.value || 'Select an item'}
          <SelectArrow className={styles.arrow} />
        </AriaSelect>
        <SelectPopover state={select} className={styles.selectList} portal>
          {children}
        </SelectPopover>
        <Box className={styles.helper}>
          {descriptionElement}
          {errorElement}
        </Box>
      </Box>
    )
  }
)

Select.displayName = 'Select'

export type SelectItemProps = React.HTMLAttributes<HTMLDivElement> & {
  value?: string
  className?: ClassValue
}

export const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(({ ...props }, ref) => {
  return <AriaSelectItem ref={ref} className={styles.selectItem} {...props} />
})

SelectItem.displayName = 'SelectItem'
