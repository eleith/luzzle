import { style } from '@vanilla-extract/css'
import { calc } from '@vanilla-extract/css-utils'
import { mediaBreakpointPhone, mediaBreakpointTablet, vars } from '@luzzle/ui/css'

export const bookContainer = style({
  display: 'flex',
  margin: 'auto',
  marginTop: vars.space[5],
  gap: vars.space[5],
  justifyContent: 'space-between',
  width: '100%',
  '@media': {
    [mediaBreakpointTablet]: {
      width: `clamp(500px, 66.6666%, 1000px)`,
    },
  },
})

export const bookNavigation = style({
  marginTop: calc.multiply(vars.space[10], 5),
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
  lineHeight: '1.5',
  marginTop: vars.space[5],
  width: '100%',
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
