import clsx from 'clsx'
import { useState, forwardRef } from 'react'
import * as styles from './styles.css'
import {
  Combobox as AriaCombobox,
  ComboboxPopover as AriaComboboxPopover,
  ComboboxItem as AriaComboboxItem,
  useComboboxState as useAriaComboboxState,
  ComboboxCancel as AriaComboboxCancel,
  ComboboxStateProps as AriaComboboxStateProps,
  ComboboxItemProps,
} from 'ariakit/combobox'

import { Box } from '../Box'

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'autoComplete'> &
  NonNullable<Omit<styles.ComboboxVariants, 'withLabel'>> & {
    state?: AriaComboboxStateProps
    error?: string
    cancellable?: boolean
    label?: string
    preventBodyScroll?: boolean
  }

export const Combobox = forwardRef<HTMLInputElement, Props>(
  (
    {
      className,
      name,
      label,
      error,
      disabled,
      placeholder,
      state,
      cancellable,
      children,
      preventBodyScroll = false,
      ...props
    },
    ref
  ) => {
    const classVariant = styles.variants({ withLabel: !!label })
    const combobox = useAriaComboboxState(state)
    const [highlight, setHighlight] = useState(false)
    const invalid = !!error

    const labelElement = label && (
      <Box id={label} className={styles.label}>
        {label}
      </Box>
    )
    const highlightElement = highlight && <span className={styles.highlight} />

    return (
      <Box data-invalid={invalid || undefined} data-disabled={disabled || undefined}>
        <label
          onMouseEnter={() => !disabled && setHighlight(true)}
          onMouseLeave={() => !disabled && setHighlight(false)}
          className={clsx(className, classVariant) || undefined}
        >
          {labelElement}
          {highlightElement}
          <AriaCombobox
            state={combobox}
            name={name}
            placeholder={placeholder}
            className={clsx(styles.input, label && styles.inputWithLabel)}
            disabled={disabled || undefined}
            {...props}
            ref={ref}
          />
          {cancellable && <AriaComboboxCancel state={combobox} className={styles.cancel} />}
        </label>
        <AriaComboboxPopover
          state={combobox}
          className={styles.popover}
          preventBodyScroll={preventBodyScroll}
        >
          {children}
        </AriaComboboxPopover>
      </Box>
    )
  }
)

export const ComboboxItem = forwardRef<HTMLDivElement, ComboboxItemProps>(
  ({ children, ...props }, ref) => {
    return (
      <AriaComboboxItem className={styles.item} {...props} ref={ref}>
        {children}
      </AriaComboboxItem>
    )
  }
)

export const ComboboxItemLink = forwardRef<HTMLAnchorElement, ComboboxItemProps<'a'>>(
  ({ children, ...props }, ref) => {
    return (
      <AriaComboboxItem
        as={'a'}
        focusOnHover
        hideOnClick={false}
        setValueOnClick={false}
        className={styles.item}
        {...props}
        ref={ref}
      >
        {children}
      </AriaComboboxItem>
    )
  }
)

Combobox.displayName = 'Combobox'
ComboboxItem.displayName = 'ComboboxItem'
ComboboxItemLink.displayName = 'ComboboxItemLink'
