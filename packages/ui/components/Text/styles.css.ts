import { style } from '@vanilla-extract/css'
import { RecipeVariants, recipe } from '@vanilla-extract/recipes'
import { theme } from '../../css/theme'
import { mediaBreakpointTablet } from '../../css/media'

const sizes = {
  title: style({
    fontSize: theme.fontSizes.titleMobile,
    fontWeight: theme.fontWeights.normal,
    letterSpacing: '-0.02',
    lineHeight: '2',
    '@media': {
      [mediaBreakpointTablet]: {
        fontSize: theme.fontSizes.title,
      },
    },
  }),
  h1: style({
    fontSize: theme.fontSizes.h1Mobile,
    fontWeight: theme.fontWeights.normal,
    letterSpacing: '-0.02',
    lineHeight: '2',
    '@media': {
      [mediaBreakpointTablet]: {
        fontSize: theme.fontSizes.h1,
      },
    },
  }),
  h2: style({
    fontSize: theme.fontSizes.h2Mobile,
    fontWeight: theme.fontWeights.normal,
    letterSpacing: '-0.02',
    lineHeight: '2',
    '@media': {
      [mediaBreakpointTablet]: {
        fontSize: theme.fontSizes.h2,
      },
    },
  }),
  h3: style({
    fontSize: theme.fontSizes.h3Mobile,
    fontWeight: theme.fontWeights.normal,
    letterSpacing: '-0.01',
    lineHeight: '1.5',
    '@media': {
      [mediaBreakpointTablet]: {
        fontSize: theme.fontSizes.h3,
      },
    },
  }),
  body: style({
    fontSize: theme.fontSizes.bodyMobile,
    fontWeight: theme.fontWeights.normal,
    letterSpacing: '-0.02',
    lineHeight: '1.5',
    '@media': {
      [mediaBreakpointTablet]: {
        fontSize: theme.fontSizes.body,
      },
    },
  }),
  label: style({
    fontSize: theme.fontSizes.labelMobile,
    fontWeight: theme.fontWeights.semiBold,
    letterSpacing: '0.03',
    textTransform: 'uppercase',
    '@media': {
      [mediaBreakpointTablet]: {
        fontSize: theme.fontSizes.label,
      },
    },
  }),
  caption: style({
    fontSize: theme.fontSizes.captionMobile,
    fontWeight: theme.fontWeights.normal,
    letterSpacing: '0.03',
    '@media': {
      [mediaBreakpointTablet]: {
        fontSize: theme.fontSizes.caption,
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
