import { style } from '@vanilla-extract/css'
import { vars } from '@app/common/ui/css'

export const navItem = style({
  cursor: 'pointer',
  padding: vars.space[5],
  color: vars.colors.surfaceVariant,
  selectors: {
    '&:hover': {
      color: vars.colors.onSurface,
    },
  },
})

export const banner = style({
  display: 'flex',
  justifyContent: 'space-between',
})
