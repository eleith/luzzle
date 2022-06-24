import { style } from '@vanilla-extract/css'
import { RecipeVariants, recipe } from '@vanilla-extract/recipes'
import { vars } from '../../css'

// originally adapted from: github.com/primer/css/blob/main/src/buttons/button.scss

const sizeVariants = {
  small: style({
    fontSize: vars.fontSizes.small,
  }),
  medium: style({
    fontSize: vars.fontSizes.medium,
  }),
  large: style({
    fontSize: vars.fontSizes.large,
  }),
}

const typeVariants = {
  button: style({
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    minWidth: '64px',
    border: 'none',
    outline: 'none',
    lineHeight: 'inherit',
    overflow: 'visible',
    verticalAlign: 'middle',
    padding: '0 8px 0 8px',
    backgroundColor: 'transparent',
    boxShadow: `0 1px 0 rgba(27,31,36,0.04), inset 0 1px 0 rgba(255,255,255,0.25)`,
    transition: '80ms cubic-bezier(0.33, 1, 0.68, 1)',
    transitionProperty: 'color, background-color, border-color, box-shadow',
    selectors: {
      '&:active': {
        outline: 'none',
        transition: 'none',
      },
      '&:hover': {
        cursor: 'pointer',
        textDecoration: 'none',
        transitionDuration: '0.1s',
      },
      '&:disabled': {
        cursor: 'default',
        pointerEvents: 'none',
      },
      '&[aria-disabled="true"]': {
        cursor: 'default',
        pointerEvents: 'none',
      },
    },
  }),
  link: style({}),
}

const buttonTypeVariants = {
  primary: style({
    background: vars.colors.primary,
    selectors: {
      '&:focus': {
        boxShadow: '0 0 0 0.2em rgba(0, 109, 255, 0.4)',
      },
      '&:hover': {},
      '&:active': {},
    },
  }),
}

export const variants = recipe({
  base: style({
    color: vars.colors.text,
  }),
  variants: {
    size: {
      ...sizeVariants,
    },
    disabled: {
      true: {
        cursor: 'auto',
        opacity: '0.5',
      },
    },
    type: {
      ...typeVariants,
    },
    buttonType: {
      ...buttonTypeVariants,
    },
  },
  compoundVariants: [],
  defaultVariants: {
    size: 'small',
    type: 'button',
  },
})

export type ButtonVariants = RecipeVariants<typeof variants>
