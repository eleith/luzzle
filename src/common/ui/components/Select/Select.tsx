import clsx, { ClassValue } from 'clsx'
import * as React from 'react'
import * as styles from './styles.css'
import {
  Select as AriaSelect,
  SelectItem as AriaSelectItem,
  SelectArrow,
  SelectPopover,
  useSelectState,
  SelectProps as AriaSelectProps,
  SelectLabel,
} from 'ariakit/select'
import {
  FormError as AriaFormError,
  FormDescription as AriaFormDescription,
  FormField,
  FormState,
  FormFieldProps,
} from 'ariakit/form'
import { Box } from '../Box'
import { useState } from 'react'
import { Disclosure } from 'ariakit'

type Items = React.ReactElement<SelectItemProps, typeof SelectItem>[]

type SelectProps = {
  children: Items
  value?: string
  label: string
  setValue?: (value: string) => void
  defaultValue?: string
  required?: boolean
  description?: string
  error?: string
  gutter?: number
  onTouch?: () => void
  state?: FormState
  name?: string | FormFieldProps['name']
} & NonNullable<styles.SelectVariants> &
  Omit<AriaSelectProps, 'state' | 'name'>

function getSelectedValue(value: string, children: Items) {
  const item = children.find((child) => child.props.value === value)
  return item?.props.display || value
}

const SelectTag = React.forwardRef<HTMLButtonElement, Omit<SelectProps, 'state'>>(
  (
    {
      children,
      value,
      label,
      setValue,
      defaultValue,
      className,
      description,
      error,
      disabled,
      gutter,
      onTouch,
      name,
      hidden,
      ...props
    },
    ref
  ) => {
    const boxRef = React.useRef<HTMLDivElement>(null)
    const [highlight, setHighlight] = useState(false)
    const invalid = !!error
    const select = useSelectState({
      value,
      setValue,
      sameWidth: true,
      getAnchorRect: () => boxRef.current?.getBoundingClientRect() || null,
      defaultValue,
      gutter,
      setOpen: (open) => {
        if (select.open !== open && !open) {
          onTouch?.()
        }
      },
    })
    const classVariant = styles.variants()
    const descriptionElement = description && name && (
      <AriaFormDescription name={name} className={styles.description}>
        {description}
      </AriaFormDescription>
    )

    const errorElement = error && name && (
      <AriaFormError name={name} className={styles.error}>
        {error}
      </AriaFormError>
    )

    const labelElement = label && (
      <Disclosure state={select} as={'div'} disabled={disabled || undefined}>
        <SelectLabel
          style={{ cursor: disabled ? 'default' : 'pointer' }}
          className={styles.label}
          state={select}
        >
          {label}
        </SelectLabel>
      </Disclosure>
    )

    const highlightElement = highlight && <span className={styles.highlight} />

    return (
      <Box
        data-invalid={invalid || undefined}
        data-disabled={disabled || undefined}
        style={{ display: hidden ? 'none' : 'initial' }}
      >
        <Box
          className={clsx(className, classVariant) || undefined}
          onMouseEnter={() => !disabled && setHighlight(true)}
          onMouseLeave={() => !disabled && setHighlight(false)}
          ref={boxRef}
        >
          {labelElement}
          {highlightElement}
          <AriaSelect
            state={select}
            as={'button'}
            ref={ref}
            hidden={hidden}
            name={name as string}
            className={styles.select}
            disabled={disabled || undefined}
            onBlur={(event: React.FocusEvent<HTMLButtonElement>) => {
              const disclosure = select.disclosureRef.current
              if (event.currentTarget.contains(event.relatedTarget)) return
              if (disclosure?.contains(event.relatedTarget)) return
              onTouch?.()
            }}
            {...props}
          >
            <Box className={styles.selected}>
              {select.value ? getSelectedValue(select.value, children) : 'Select one'}
            </Box>
            <SelectArrow className={styles.arrow} />
          </AriaSelect>
          <SelectPopover state={select} className={styles.selectList} portal>
            {children}
          </SelectPopover>
        </Box>
        <Box className={styles.helper}>{descriptionElement || errorElement || '\u00A0'}</Box>
      </Box>
    )
  }
)

SelectTag.displayName = 'InputSelect'

export const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  ({ state, children, value, name, ...props }, ref) => {
    if (state && name) {
      return (
        <FormField
          as={SelectTag}
          name={name}
          value={value}
          setValue={(value: string) => state?.setValue(name, value)}
          touchOnBlur={false}
          onTouch={() => state?.setFieldTouched(name, true)}
          ref={ref}
          {...props}
        >
          {children}
        </FormField>
      )
    } else {
      return (
        <SelectTag name={name} value={value} ref={ref} {...props}>
          {children}
        </SelectTag>
      )
    }
  }
)

Select.displayName = 'Select'

export type SelectItemProps = React.HTMLAttributes<HTMLDivElement> & {
  value: string
  className?: ClassValue
  display?: string
}

export const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(({ ...props }, ref) => {
  return <AriaSelectItem ref={ref} className={styles.selectItem} {...props} />
})

SelectItem.displayName = 'SelectItem'
