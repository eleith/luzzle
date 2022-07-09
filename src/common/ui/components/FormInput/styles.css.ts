import { style } from '@vanilla-extract/css'
import { RecipeVariants, recipe } from '@vanilla-extract/recipes'
import { vars } from '../../css'

const sizes = {
  xl: style({
    fontSize: vars.fontSizes.xl,
    fontWeight: vars.fontWeights.medium,
    letterSpacing: '-0.02',
    lineHeight: vars.lineHeights[2],
  }),
  large: style({
    fontSize: vars.fontSizes.large,
    fontWeight: vars.fontWeights.normal,
    letterSpacing: '-0.02',
    lineHeight: vars.lineHeights[2],
  }),
  small: style({
    fontSize: vars.fontSizes.small,
    fontWeight: vars.fontWeights.normal,
    letterSpacing: '-0.01',
    lineHeight: vars.lineHeights[1.5],
  }),
  medium: style({
    fontSize: vars.fontSizes.medium,
    fontWeight: vars.fontWeights.normal,
    letterSpacing: '-0.02',
    lineHeight: vars.lineHeights[1.5],
  }),
  label: style({
    fontSize: vars.fontSizes.label,
    fontWeight: vars.fontWeights.semiBold,
    letterSpacing: '0.03',
    textTransform: 'uppercase',
  }),
}

export const variants = recipe({
  base: {},
  variants: {
    size: {
      ...sizes,
    },
  },
})

export const inputContainer = style({
  background: vars.colors.surfaceVariant,
  color: vars.colors.onSurfaceVariant,
  padding: vars.space[7],
  borderBottom: 'solid black 1px',
  height: '2em',
  position: 'relative',
  selectors: {
    '&:focus-within': {
      background: vars.colors.surfaceInverse,
      color: vars.colors.onSurfaceInverse,
      borderBottom: `solid ${vars.colors.primary} 2px`,
    },
  },
})

export const inputLabel = style({
  color: vars.colors.onSurfaceVariant,
  position: 'absolute',
  top: 0,
  right: 0,
  bottom: 0,
  left: '2em',
  display: 'flex',
  alignItems: 'center',
  transition: 'all 0.2s ease-in-out',
  selectors: {
    [`${inputContainer}:focus-within &`]: {
      fontSize: vars.fontSizes.xs,
      color: vars.colors.onSurfaceInverse,
      top: `calc(0px - ${vars.space[8]})`,
    },
  },
})

export const resetInput = style({
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: vars.colors.onSurfaceInverse,
  width: '100%',
  resize: 'none',
  lineHeight: vars.lineHeights.none,
  padding: 0,
  fontSize: vars.fontSizes.medium,
  fontFamily: vars.fonts.sans,
})

export type FormInputVariants = RecipeVariants<typeof variants>
