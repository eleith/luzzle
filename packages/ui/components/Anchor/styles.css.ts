import { style } from '@vanilla-extract/css'
import { recipe, RecipeVariants } from '@vanilla-extract/recipes'
import { vars } from '../../css'

const colors = {
  primary: style({
    color: vars.colors.primary,
    selectors: {
      '&:hover': {},
      '&:visited': {},
    },
  }),
  inherit: style({
    color: 'inherit',
    selectors: {
      '&:hover': {},
      '&:visited': {},
    },
  }),
}

const hoverActions = {
  underline: style({
    selectors: {
      '&:hover': {
        textDecoration: 'underline',
      },
    },
  }),
  none: style({}),
  animateUnderline: style({
    backgroundImage: 'linear-gradient(currentColor, currentColor)',
    backgroundPosition: '0 100%',
    backgroundRepeat: 'no-repeat',
    backgroundSize: '0 2px',
    transition: 'background-size 0.3s',
    selectors: {
      '&:hover': {
        backgroundSize: '100% 2px',
      },
      '&:active': {
        backgroundSize: '100% 2px',
      },
      '&:focus': {
        backgroundSize: '100% 2px',
      },
    },
  }),
}

export const variants = recipe({
  base: style({
    position: 'relative',
    textDecoration: 'none',
    selectors: {
      '&:hover': {
        cursor: 'pointer',
      },
      '&:visited': {
        opacity: '0.5',
      },
      '&:focus': {
        outlineOffset: '2px',
      },
      '&:focus-visible': {
        outlineOffset: '2px',
      },
    },
  }),
  variants: {
    disabled: {
      true: {
        cursor: 'not-allowed',
        color: vars.colors.surface,
        selectors: {
          '&:hover': {
            cursor: 'not-allowed',
          },
        },
      },
    },
    color: {
      ...colors,
    },
    hoverAction: {
      ...hoverActions,
    },
  },
  compoundVariants: [],
  defaultVariants: {
    color: 'primary',
    hoverAction: 'none',
  },
})

export type AnchorVariants = RecipeVariants<typeof variants>
