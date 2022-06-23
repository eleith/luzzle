import { style } from '@vanilla-extract/css'
import { vars } from '@app/common/ui/css'

export const themeButton = style({
  cursor: 'pointer',
  padding: vars.space[5],
})

export const banner = style({
  display: 'flex',
  justifyContent: 'flex-end',
})
