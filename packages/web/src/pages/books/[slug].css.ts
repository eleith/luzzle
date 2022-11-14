import { style } from '@vanilla-extract/css'
import { mediaBreakpointPhone, mediaBreakpointTablet, vars } from '@luzzle/ui/css'

export const bookContainer = style({
  display: 'flex',
  margin: vars.space.auto,
  marginTop: vars.space[5],
  gap: vars.space[5],
  justifyContent: 'space-between',
  width: vars.space.full,
  '@media': {
    [mediaBreakpointTablet]: {
      width: `clamp(${vars.space[64]}, ${vars.space['2/3']}, ${vars.space[256]})`,
    },
  },
})

export const bookNavigation = style({
  marginTop: vars.space[52],
})

export const bookCard = style({
  display: 'flex',
  gap: vars.space[10],
  justifyContent: 'center',
  margin: '20px',
  flexWrap: 'wrap',
  alignItems: 'center',
})

export const bookDetails = style({
  lineHeight: vars.lineHeights[1.5],
  marginTop: vars.space[5],
  width: vars.space.full,
})

export const showOnMobile = style({
  '@media': {
    [mediaBreakpointPhone]: {
      display: 'none',
    },
  },
})

export const hideOnMobile = style({
  display: 'none',
  '@media': {
    [mediaBreakpointPhone]: {
      display: 'unset',
    },
  },
})

export const book = style({
  marginBottom: vars.space[5],
  marginTop: vars.space[5],
})
