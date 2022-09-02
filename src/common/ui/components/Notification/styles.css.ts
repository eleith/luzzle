import { style } from '@vanilla-extract/css'
import { RecipeVariants, recipe } from '@vanilla-extract/recipes'
import { mediaBreakpointTablet, vars } from '@app/common/ui/css'

export const variants = recipe({
  base: style({
    position: 'absolute',
    bottom: vars.space[4],
    left: '0',
    right: '0',
    zIndex: 1000,
    margin: 'auto',
    padding: vars.space[2],
    display: 'flex',
    alignItems: 'center',
    gap: vars.space[2],
    justifyContent: 'space-between',
    boxShadow: vars.shadows.raised,
    borderRadius: vars.radii.small,
    backgroundColor: vars.colors.surfaceVariant,
    color: vars.colors.onSurfaceVariant,
    minWidth: '65%',
    width: 'fit-content',
    '@media': {
      [mediaBreakpointTablet]: {
        left: vars.space[4],
        right: 'auto',
        minWidth: '40%',
      },
    },
  }),
  variants: {},
})

export type NotificationVariants = RecipeVariants<typeof variants>
