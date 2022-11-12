import { style } from '@vanilla-extract/css'
import { RecipeVariants, recipe } from '@vanilla-extract/recipes'
import { vars } from '../../css'

export const variants = recipe({
  base: {
    fontSize: vars.fontSizes.bodyMobile,
    fontWeight: vars.fontWeights.normal,
    letterSpacing: '-0.02',
    backgroundColor: vars.colors.surfaceVariant,
    borderTopLeftRadius: vars.radii.small,
    borderTopRightRadius: vars.radii.small,
    borderBottomLeftRadius: '0px',
    borderBottomRightRadius: '0px',
    padding: 0,
    minHeight: '56px',
    height: '100%',
    position: 'relative',
    display: 'block',
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    borderBottomColor: vars.colors.onSurfaceVariant,
    selectors: {
      '&:focus-within': {
        borderBottomColor: vars.colors.primary,
      },
      '[data-invalid=true] &': {
        borderBottomColor: vars.colors.error,
      },
      '[data-disabled=true] &': {
        opacity: 0.38,
      },
    },
  },
  variants: {},
})

export const textArea = style({
  fontSize: vars.fontSizes.bodyMobile,
  fontWeight: vars.fontWeights.normal,
  letterSpacing: '-0.02',
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: vars.colors.onSurfaceVariant,
  borderRadius: '0px',
  width: '100%',
  appearance: 'none',
  paddingLeft: '16px',
  paddingRight: '16px',
  overflow: 'scroll',
  fontFamily: vars.fonts.sans,
  caretColor: vars.colors.primary,
  direction: 'inherit',
  resize: 'vertical',
})

export const label = style({
  fontSize: vars.fontSizes.labelMobile,
  fontWeight: vars.fontWeights.light,
  letterSpacing: '-0.02',
  lineHeight: vars.lineHeights['1.5'],
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  padding: '0px 16px',
  paddingTop: '3px',
  overflow: 'hidden',
  selectors: {
    '[data-invalid=true] &': {
      color: vars.colors.error,
    },
  },
})

export const highlight = style({
  backgroundColor: vars.colors.onSurfaceVariant,
  position: 'absolute',
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
  opacity: 0.14,
  pointerEvents: 'none',
  selectors: {
    '[data-invalid=true] &': {
      backgroundColor: vars.colors.error,
    },
  },
})

export const helper = style({
  display: 'flex',
  selectors: {
    '[data-disabled=true] &': {
      opacity: 0.38,
    },
  },
})

export const description = style({
  color: vars.colors.onBackground,
  fontSize: vars.fontSizes.labelMobile,
  paddingTop: vars.space[1],
  paddingBottom: vars.space[1],
  paddingLeft: vars.space[1],
})

export const count = style({
  marginLeft: 'auto',
  color: vars.colors.onBackground,
  fontSize: vars.fontSizes.labelMobile,
  paddingTop: vars.space[1],
  paddingBottom: vars.space[1],
  paddingLeft: vars.space[1],
})

export const error = style({
  color: vars.colors.error,
  fontSize: vars.fontSizes.labelMobile,
  paddingTop: vars.space[1],
  paddingBottom: vars.space[1],
  paddingLeft: vars.space[1],
})

export type TextAreaVariants = RecipeVariants<typeof variants>
