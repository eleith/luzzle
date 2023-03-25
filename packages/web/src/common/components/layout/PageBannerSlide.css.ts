import { style } from '@vanilla-extract/css'
import { vars } from '@luzzle/ui/css'

export const navItem = style({
  cursor: 'pointer',
  padding: vars.space[5],
  color: vars.colors.outline,
  selectors: {
    '&:hover': {
      color: vars.colors.primary,
    },
  },
})

export const banner = style({
  display: 'flex',
  justifyContent: 'space-between',
})
