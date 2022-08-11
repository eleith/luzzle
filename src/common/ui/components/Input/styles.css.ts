import { style, globalStyle } from '@vanilla-extract/css'
import { RecipeVariants, recipe } from '@vanilla-extract/recipes'
import { vars } from '../../css'

globalStyle('.mdc-text-field--focused:not(.mdc-text-field--disabled) .mdc-floating-label', {
  color: `${vars.colors.onSurfaceVariant}!important`,
})

globalStyle('.mdc-text-field:not(.mdc-text-field--disabled)', {
  backgroundColor: `${vars.colors.surfaceVariant}!important`,
})

export const variants = recipe({
  base: {
    fontSize: vars.fontSizes.medium,
    fontWeight: vars.fontWeights.normal,
    letterSpacing: '-0.02',
    backgroundColor: vars.colors.surfaceVariant,
    height: '56px',
    borderTopLeftRadius: vars.radii.small,
    borderTopRightRadius: vars.radii.small,
    borderBottomLeftRadius: '0px',
    borderBottomRightRadius: '0px',
    display: 'inline-flex',
    alignItems: 'baseline',
    padding: '0px 16px',
    position: 'relative',
    overflow: 'hidden',
    borderBottom: `solid ${vars.colors.onSurfaceVariant} 2px`,
    selectors: {
      '&:focus-within': {
        borderBottom: `solid ${vars.colors.primary} 2px`,
      },
    },
  },
  variants: {
    hasLabel: {
      true: {
        selectors: {
          '&::before': {
            display: 'inline-block',
            width: '0px',
            height: '40px',
            content: '""',
            verticalAlign: '0px',
          },
        },
      },
    },
  },
})

export const input = style({
  fontSize: vars.fontSizes.medium,
  fontWeight: vars.fontWeights.normal,
  letterSpacing: '-0.02',
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: vars.colors.onSurfaceVariant,
  width: '100%',
  minWidth: '0px',
  height: '28px',
  borderRadius: '0px',
  appearance: 'none',
  padding: 0,
  fontFamily: vars.fonts.sans,
  caretColor: vars.colors.primary,
  direction: 'inherit',
})

export const inputWithLabel = style({
  fontSize: vars.fontSizes.medium,
  fontWeight: vars.fontWeights.normal,
  letterSpacing: '-0.02',
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: vars.colors.onSurfaceVariant,
  width: '100%',
  minWidth: '0px',
  height: '100%',
  borderRadius: '0px',
  appearance: 'none',
  padding: 0,
  fontFamily: vars.fonts.sans,
  caretColor: vars.colors.primary,
  direction: 'inherit',
})

export const label = style({
  fontSize: vars.fontSizes.small,
  fontWeight: vars.fontWeights.light,
  letterSpacing: '-0.02',
  position: 'absolute',
  transformOrigin: 'left top 0px',
  lineHeight: vars.lineHeights['1.5'],
  textAlign: 'left',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
})

export const highlight = style({
  backgroundColor: vars.colors.onSurfaceVariant,
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  opacity: 0.14,
  pointerEvents: 'none',
})

export type FormInputVariants = RecipeVariants<typeof variants>
