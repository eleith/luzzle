import { style } from '@vanilla-extract/css'
import { vars } from '@app/common/ui/css'
import { mediaBreakpointTablet, mediaBreakpointLaptop } from '@app/common/ui/css'

export const booksContainer = style({
  display: 'grid',
  width: vars.space.full,
  margin: vars.space.auto,
  marginTop: vars.space[20],
  gridTemplateColumns: '1fr',
  gridAutoFlow: 'row',
  justifyItems: 'center',
  alignItems: 'flex-end',
  gap: vars.space[15],
  textAlign: 'center',
  '@media': {
    [mediaBreakpointTablet]: {
      width: vars.space.full,
      margin: vars.space.auto,
      marginTop: vars.space[44],
      gridTemplateColumns: '1fr 1fr 1fr',
      gridAutoFlow: 'column',
      gap: vars.space[15],
      textAlign: 'center',
    },
    [mediaBreakpointLaptop]: {
      width: '70%',
      margin: vars.space.auto,
      marginTop: vars.space[44],
      gridTemplateColumns: '1fr 1fr 1fr',
      gridAutoFlow: 'column',
      gap: vars.space[15],
      textAlign: 'center',
    },
  },
})

export const booksLabel = style({
  paddingTop: vars.space[10],
  fontSize: vars.fontSizes.large,
})

export const booksActions = style({
  marginTop: vars.space[10],
  marginBottom: vars.space[10],
  display: 'flex',
  justifyContent: 'center',
})
