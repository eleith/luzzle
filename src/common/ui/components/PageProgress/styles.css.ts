import { style } from '@vanilla-extract/css'
import { RecipeVariants, recipe } from '@vanilla-extract/recipes'
import { vars } from '../../css'

export const loader = style({
  height: '100%',
  transitionProperty: 'width',
  transitionDuration: '350ms',
  transitionTimingFunction: 'ease',
  width: '0%',
  boxShadow: vars.shadows.raised,
})

export const container = style({
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
})

export const variants = recipe({
  base: style({}),
  variants: {},
})

export type PageProgressVariants = RecipeVariants<typeof variants>
