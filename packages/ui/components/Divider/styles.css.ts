import { style } from '@vanilla-extract/css'
import { recipe, RecipeVariants } from '@vanilla-extract/recipes'
import { vars } from '../../css'

export const variants = recipe({
  base: style({
    borderBottomColor: vars.colors.outline,
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
  }),
  variants: {},
  compoundVariants: [],
  defaultVariants: {},
})

export type Variants = RecipeVariants<typeof variants>
