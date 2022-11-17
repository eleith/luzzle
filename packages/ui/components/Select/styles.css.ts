import { style } from '@vanilla-extract/css'
import { RecipeVariants, recipe } from '@vanilla-extract/recipes'
import { mediaBreakpointTablet, vars } from '../../css'

export const variants = recipe({
  base: {
    fontSize: vars.fontSizes.body,
    fontWeight: vars.fontWeights.normal,
    letterSpacing: '-0.02',
    backgroundColor: vars.colors.surfaceVariant,
    borderTopLeftRadius: vars.radii.small,
    borderTopRightRadius: vars.radii.small,
    borderBottomLeftRadius: '0px',
    borderBottomRightRadius: '0px',
    padding: '0px',
    position: 'relative',
    overflow: 'hidden',
    cursor: 'pointer',
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    borderBottomColor: vars.colors.onSurfaceVariant,
    selectors: {
      '&:focus-within': {
        borderBottomColor: vars.colors.primary,
      },
      '&[aria-invalid=true]': {
        borderBottomColor: vars.colors.error,
      },
      '[data-disabled=true] &': {
        opacity: 0.38,
        cursor: 'default',
      },
    },
  },
  variants: {},
})

export const select = style({
  fontSize: vars.fontSizes.body,
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
  flexGrow: '1',
  padding: '0px 8px 4px 8px',
  fontFamily: vars.fonts.sans,
  direction: 'inherit',
  textAlign: 'inherit',
  cursor: 'pointer',
  display: 'flex',
  justifyContent: 'space-between',
})

export const label = style({
  fontSize: vars.fontSizes.label,
  fontWeight: vars.fontWeights.light,
  letterSpacing: '-0.02',
  paddingTop: '3px',
  paddingLeft: '8px',
  paddingRight: '8px',
  lineHeight: '1.5',
  textAlign: 'left',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  selectors: {
    '[data-invalid=true] &': {
      color: vars.colors.error,
    },
  },
  '@media': {
    [mediaBreakpointTablet]: {
      paddingLeft: '16px',
      paddingRight: '16px',
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
    '[data-invalid=true] > &': {
      backgroundColor: vars.colors.error,
    },
  },
})

export const selectList = style({
  display: 'flex',
  flexDirection: 'column',
  outline: 'none',
  overflow: 'auto',
  overscrollBehavior: 'contain',
  filter: `drop-shadow(0px 0px 3px ${vars.colors.shadowHeavy})`,
  color: vars.colors.onBackground,
  background: vars.colors.background,
})

export const selectItem = style({
  outline: 'none',
  display: 'flex',
  fontSize: vars.fontSizes.body,
  scrollMargin: vars.space['0.5'],
  alignItems: 'center',
  gap: vars.space['0.5'],
  padding: '8px',
  cursor: 'pointer',
  selectors: {
    '&[data-active-item]': {
      backgroundColor: vars.colors.primary,
      color: vars.colors.onPrimary,
    },
  },
  '@media': {
    [mediaBreakpointTablet]: {
      padding: '16px',
    },
  },
})

export const arrow = style({})

export const helper = style({
  display: 'flex',
})

export const description = style({
  color: vars.colors.onBackground,
  fontSize: vars.fontSizes.label,
  paddingTop: vars.space[1],
  paddingBottom: vars.space[1],
  paddingLeft: vars.space[1],
  '@media': {
    [mediaBreakpointTablet]: {
      fontSize: vars.fontSizes.label,
    },
  },
})

export const error = style({
  color: vars.colors.error,
  fontSize: vars.fontSizes.label,
  paddingTop: vars.space[1],
  paddingBottom: vars.space[1],
  paddingLeft: vars.space[1],
  '@media': {
    [mediaBreakpointTablet]: {
      fontSize: vars.fontSizes.label,
    },
  },
})

export const selected = style({
  textOverflow: 'ellipsis',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  width: '100%',
})

export type SelectVariants = RecipeVariants<typeof variants>
