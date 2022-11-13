import { style } from '@vanilla-extract/css'
import { RecipeVariants, recipe } from '@vanilla-extract/recipes'
import { mediaBreakpointTablet, vars } from '../../css'

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
    display: 'block',
    padding: '0px',
    position: 'relative',
    overflow: 'hidden',
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    borderBottomColor: vars.colors.onSurfaceVariant,
    '@media': {
      [mediaBreakpointTablet]: {
        fontSize: vars.fontSizes.body,
      },
    },
    selectors: {
      '&:focus-within': {
        borderBottomColor: vars.colors.primary,
      },
      '[data-invalid=true] &': {
        borderBottomColor: vars.colors.error,
      },
      '[data-disabled=true] &': {
        opacity: 0.38,
        cursor: 'default',
      },
    },
  },
  variants: {
    withLabel: {
      true: {
        height: '56px',
      },
    },
  },
})

export const input = style({
  fontSize: vars.fontSizes.bodyMobile,
  fontWeight: vars.fontWeights.normal,
  letterSpacing: '-0.02',
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: vars.colors.onSurfaceVariant,
  width: '100%',
  minWidth: '0px',
  borderRadius: '0px',
  appearance: 'none',
  padding: '8px',
  fontFamily: vars.fonts.sans,
  caretColor: vars.colors.primary,
  direction: 'inherit',
  '@media': {
    [mediaBreakpointTablet]: {
      fontSize: vars.fontSizes.body,
      padding: '16px',
    },
  },
})

export const inputWithLabel = style({
  paddingTop: '0px',
  paddingBottom: '0px',
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

export const label = style({
  fontSize: vars.fontSizes.labelMobile,
  fontWeight: vars.fontWeights.light,
  letterSpacing: '-0.02',
  lineHeight: vars.lineHeights['1.5'],
  textAlign: 'left',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  paddingTop: '3px',
  overflow: 'hidden',
  paddingLeft: '8px',
  selectors: {
    '[data-invalid=true] &': {
      color: vars.colors.error,
    },
  },
  '@media': {
    [mediaBreakpointTablet]: {
      fontSize: vars.fontSizes.label,
      padding: '16px',
    },
  },
})

export const popover = style({
  backgroundColor: vars.colors.surfaceVariant,
  color: vars.colors.onSurfaceVariant,
  borderColor: vars.colors.onSurfaceVariant,
  borderStyle: 'solid',
  borderWidth: '1px',
  marginTop: '14px',
  zIndex: 100,
  position: 'relative',
  display: 'flex',
  maxHeight: 'min(var(--popover-available-height,300px),300px)',
  flexDirection: 'column',
  overflow: 'auto',
  overscrollBehavior: 'contain',
  borderBottomLeftRadius: '0.5rem',
  borderBottomRightRadius: '0.5rem',
  outline: '2px solid transparent',
  outlineOffset: '2px',
  filter: 'drop-shadow(0 10px 8px rgb(0 0 0 / 0.04)) drop-shadow(0 4px 3px rgb(0 0 0 / 0.1))',
})

export const item = style({
  fontSize: vars.fontSizes.bodyMobile,
  padding: '8px',
  '@media': {
    [mediaBreakpointTablet]: {
      fontSize: vars.fontSizes.body,
      padding: '16px',
    },
  },
  selectors: {
    '&:hover': {
      backgroundColor: vars.colors.onSurfaceVariant,
      color: vars.colors.surfaceVariant,
      cursor: 'pointer',
    },
    '&[data-active-item]': {
      backgroundColor: vars.colors.onSurface,
      color: vars.colors.surface,
    },
  },
})
export const cancel = style({})

export type ComboboxVariants = RecipeVariants<typeof variants>
