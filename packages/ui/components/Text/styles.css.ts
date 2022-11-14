import { style } from '@vanilla-extract/css'
import { RecipeVariants, recipe } from '@vanilla-extract/recipes'
import { vars } from '../../css'
import { mediaBreakpointTablet } from '../../css/media'

const sizes = {
  title: style({
    fontSize: vars.fontSizes.titleMobile,
    fontWeight: vars.fontWeights.normal,
    letterSpacing: '-0.02',
    lineHeight: vars.lineHeights[2],
    '@media': {
      [mediaBreakpointTablet]: {
        fontSize: vars.fontSizes.title,
      },
    },
  }),
  h1: style({
    fontSize: vars.fontSizes.h1Mobile,
    fontWeight: vars.fontWeights.normal,
    letterSpacing: '-0.02',
    lineHeight: vars.lineHeights[2],
    '@media': {
      [mediaBreakpointTablet]: {
        fontSize: vars.fontSizes.h1,
      },
    },
  }),
  h2: style({
    fontSize: vars.fontSizes.h2Mobile,
    fontWeight: vars.fontWeights.normal,
    letterSpacing: '-0.02',
    lineHeight: vars.lineHeights[2],
    '@media': {
      [mediaBreakpointTablet]: {
        fontSize: vars.fontSizes.h2,
      },
    },
  }),
  h3: style({
    fontSize: vars.fontSizes.h3Mobile,
    fontWeight: vars.fontWeights.normal,
    letterSpacing: '-0.01',
    lineHeight: vars.lineHeights[1.5],
    '@media': {
      [mediaBreakpointTablet]: {
        fontSize: vars.fontSizes.h3,
      },
    },
  }),
  body: style({
    fontSize: vars.fontSizes.bodyMobile,
    fontWeight: vars.fontWeights.normal,
    letterSpacing: '-0.02',
    lineHeight: vars.lineHeights[1.5],
    '@media': {
      [mediaBreakpointTablet]: {
        fontSize: vars.fontSizes.body,
      },
    },
  }),
  label: style({
    fontSize: vars.fontSizes.labelMobile,
    fontWeight: vars.fontWeights.semiBold,
    letterSpacing: '0.03',
    textTransform: 'uppercase',
    '@media': {
      [mediaBreakpointTablet]: {
        fontSize: vars.fontSizes.label,
      },
    },
  }),
  caption: style({
    fontSize: vars.fontSizes.captionMobile,
    fontWeight: vars.fontWeights.normal,
    letterSpacing: '0.03',
    '@media': {
      [mediaBreakpointTablet]: {
        fontSize: vars.fontSizes.caption,
      },
    },
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
