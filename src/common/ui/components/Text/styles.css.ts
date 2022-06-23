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
  base: {  },
  variants: {
    size: {
      ...sizes,
    },
    ellipsis: {
      true: style({
        textOverflow: 'ellipsis',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
      }),
    },
  },
})

export type TextSizes = keyof typeof sizes
export type TextVariants = RecipeVariants<typeof variants>
