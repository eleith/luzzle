import { style } from '@vanilla-extract/css'
import { recipe, RecipeVariants } from '@vanilla-extract/recipes'
import { vars } from '../../css'

// originally adapted from: github.com/primer/css/blob/main/src/marketing/links/link.scss

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
    selectors: {
      '&::before': {
        position: 'absolute',
        bottom: '0.15em',
        width: '100%',
        height: '2px',
        pointerEvents: 'none',
        content: '',
        margin: '1px 0',
        backgroundColor: 'currentcolor',
        transform: 'scaleX(0)',
        transition: 'transform 0.2s ease-in-out 0s',
      },
      '&:hover::before': {
        transform: 'scaleX(1)',
      },
      '&:active::before': {
        transform: 'scaleX(1)',
      },
    },
  }),
}

export const variants = recipe({
  base: style({
    position: 'relative',
    display: 'inline-block',
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
