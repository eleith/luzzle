import { style } from '@vanilla-extract/css'
import { RecipeVariants, recipe } from '@vanilla-extract/recipes'
import { vars } from '../../css'

const sizes = {
  title: style({
    fontSize: vars.fontSizes.title,
    fontWeight: vars.fontWeights.normal,
    letterSpacing: '-0.02',
    lineHeight: vars.lineHeights[2],
  }),
  h1: style({
    fontSize: vars.fontSizes.h1,
    fontWeight: vars.fontWeights.normal,
    letterSpacing: '-0.02',
    lineHeight: vars.lineHeights[2],
  }),
  h2: style({
    fontSize: vars.fontSizes.h2,
    fontWeight: vars.fontWeights.normal,
    letterSpacing: '-0.02',
    lineHeight: vars.lineHeights[2],
  }),
  h3: style({
    fontSize: vars.fontSizes.h3,
    fontWeight: vars.fontWeights.normal,
    letterSpacing: '-0.01',
    lineHeight: vars.lineHeights[1.5],
  }),
  body: style({
    fontSize: vars.fontSizes.body,
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
    ellipsis: {
      true: style({
        textOverflow: 'ellipsis',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
      }),
    },
  },
  defaultVariants: {
    size: 'body',
  },
})

export type TextSizes = keyof typeof sizes
export type TextVariants = RecipeVariants<typeof variants>
