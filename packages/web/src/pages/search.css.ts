import { style } from '@vanilla-extract/css'
import { vars } from '@luzzle/ui/css'

export const search = style({
  position: 'sticky',
  top: 0,
  zIndex: 1,
})

export const searchInput = style({
  padding: vars.space[2],
})

export const searchButton = style({
  position: 'absolute',
  top: 0,
  right: 12,
  bottom: 0,
  margin: 'auto',
  borderRadius: '50%',
})

export const searchResults = style({
  padding: vars.space[2],
})
