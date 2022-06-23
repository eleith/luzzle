import { style } from '@vanilla-extract/css'
import { mediaBreakpointLaptop, vars } from '@app/common/ui/css'

export const bookContainer = style({
  display: 'flex',
  width: vars.space.full,
  margin: vars.space.auto,
  marginTop: vars.space[5],
  gap: vars.space[5],
  justifyContent: 'space-between',
  alignItems: 'center',
})

export const bookDetails = style({
  lineHeight: vars.lineHeights[1.5],
  marginTop: vars.space[5],
  "@media": {
    [mediaBreakpointLaptop]: {
      width: vars.space['1/3'],
    },
  },
})

export const book = style({
  marginBottom: vars.space[5],
})
