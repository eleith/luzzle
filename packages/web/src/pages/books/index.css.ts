import { style } from '@vanilla-extract/css'
import { vars } from '@luzzle/ui/css'
import { mediaBreakpointTablet, mediaBreakpointLaptop } from '@luzzle/ui/css'

export const booksContainer = style({
  display: 'grid',
  width: vars.space.full,
  margin: vars.space.auto,
  marginTop: vars.space[20],
  marginBottom: vars.space[10],
  gridTemplateColumns: 'repeat(auto-fill, 140px)',
  alignItems: 'center',
  justifyContent: 'center',
  gap: vars.space[5],
  selectors: {
    '&::last-child': {
      marginRight: 'auto',
    },
  },
  '@media': {
    [mediaBreakpointTablet]: {},
    [mediaBreakpointLaptop]: {},
  },
})

export const booksActions = style({
  textAlign: 'center',
  padding: `${vars.space[5]} 0 ${vars.space[5]} 0`,
})
