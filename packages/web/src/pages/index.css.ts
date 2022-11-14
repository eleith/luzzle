import { style } from '@vanilla-extract/css'
import { mediaBreakpointLaptop, mediaBreakpointTablet, vars } from '@luzzle/ui/css'

export const page = style({
  margin: vars.space[4],
  marginBottom: vars.space[8],
  '@media': {
    [mediaBreakpointTablet]: {
      width: vars.space['2/3'],
      marginLeft: vars.space.auto,
      marginRight: vars.space.auto,
    },
    [mediaBreakpointLaptop]: {
      width: vars.space['1/2'],
      marginLeft: vars.space.auto,
      marginRight: vars.space.auto,
    },
  },
})

export const books = style({
  display: 'flex',
  gap: '3rem',
  flexWrap: 'wrap',
  justifyContent: 'center',
})
