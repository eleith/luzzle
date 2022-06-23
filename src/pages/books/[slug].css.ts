import { style } from '@vanilla-extract/css'
import { vars } from '@app/common/ui/css'

export const bookContainer = style({
  display: 'flex',
  width: vars.space.full,
  margin: vars.space.auto,
  marginTop: vars.space[10],
  gap: vars.space[5],
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingLeft: vars.space[10],
  paddingRight: vars.space[10],
})

export const bookDetails = style({
  width: vars.space[96],
  lineHeight: vars.lineHeights[1.5],
  marginTop: vars.space[5],
})

export const book = style({
  marginBottom: vars.space[5],
})
