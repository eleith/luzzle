import clsx, { ClassValue } from 'clsx'
import * as React from 'react'
import * as styles from './styles.css'
import {
  Select as AriaSelect,
  SelectItem as AriaSelectItem,
  SelectArrow,
  SelectPopover,
  useSelectState,
} from 'ariakit/select'
import { Box } from '../Box'
import { useState } from 'react'

type Props = {
  children?: React.ReactNode
  value?: string
  label?: string
  setValue?: (value: string) => void
  defaultValue?: string
  required?: boolean
  onTouch?: () => void
} & styles.FormInputVariants &
  React.ButtonHTMLAttributes<HTMLButtonElement>

export const Select = React.forwardRef(
  (
    { children, value, label, setValue, defaultValue, onTouch, className, ...props }: Props,
    ref: React.Ref<HTMLButtonElement>
  ) => {
    const boxRef = React.useRef<HTMLDivElement>(null)
    const [highlight, setHighlight] = useState(false)
    const select = useSelectState({
      value,
      setValue,
      sameWidth: true,
      getAnchorRect: () => boxRef.current?.getBoundingClientRect() || null,
      defaultValue,
      setOpen: (open) => {
        if (select.open !== open && !open) {
          onTouch?.()
        }
      },
    })
    const classVariant = styles.variants({ hasLabel: !!label })

    return (
      <Box
        className={clsx(className, classVariant) || undefined}
        onMouseEnter={() => setHighlight(true)}
        onMouseLeave={() => setHighlight(false)}
        ref={boxRef}
      >
        {label && (
          <span id="label" className={styles.label}>
            {label}
          </span>
        )}
        <span className={highlight ? styles.highlight : ''} />
        <AriaSelect
          state={select}
          as={'button'}
          ref={ref}
          className={label ? styles.selectWithLabel : styles.select}
          {...props}
          onBlur={(event: React.FocusEvent<HTMLButtonElement>) => {
            props.onBlur?.(event)
            if (event.defaultPrevented) return
            const popover = select.popoverRef.current
            if (popover?.contains(event.relatedTarget)) return
            onTouch?.()
          }}
        >
          {select.value || 'Select an item'}
          <SelectArrow className={styles.arrow} />
        </AriaSelect>
        <SelectPopover
          state={select}
          className={styles.selectList}
          modal
          onBlur={(event) => {
            const disclosure = select.disclosureRef.current
            if (event.currentTarget.contains(event.relatedTarget)) return
            if (disclosure?.contains(event.relatedTarget)) return
            onTouch?.()
          }}
        >
          {children}
        </SelectPopover>
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
