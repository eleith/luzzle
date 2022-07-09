import { style } from '@vanilla-extract/css'
import { RecipeVariants, recipe } from '@vanilla-extract/recipes'
import { vars } from '../../css'

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
    selectors: {
      '&:active': {},
      '&:hover': {},
      '&:disabled': {},
      '&[aria-disabled="true"]': {},
    },
  }),
  link: style({}),
}

const buttonTypeVariants = {
  primary: style({
    selectors: {
      '&:focus': {},
      '&:hover': {},
      '&:active': {},
    },
  }),
}

export const variants = recipe({
  base: style({}),
  variants: {
    size: {
      ...sizeVariants,
    },
    disabled: {
      true: {},
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
