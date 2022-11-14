import { style } from '@vanilla-extract/css'
import { RecipeVariants, recipe } from '@vanilla-extract/recipes'
import { mediaBreakpointTablet, vars } from '../../css'

const typeVariants = {
  button: style({
    textTransform: 'uppercase',
    selectors: {
      '&:active': {},
      '&:hover': {
        cursor: 'pointer',
      },
      '&:disabled': {},
      '&[aria-disabled="true"]': {},
    },
  }),
  link: style({}),
}

export const variants = recipe({
  base: style({
    overflow: 'hidden',
    position: 'relative',
    display: 'inline-flex',
    justifyContent: 'center',
    fontSize: vars.fontSizes.bodyMobile,
    minWidth: vars.space[24],
    border: 'medium none',
    outline: 'currentcolor none medium',
    lineHeight: 'inherit',
    verticalAlign: 'middle',
    alignItems: 'center',
    userSelect: 'none',
    appearance: 'none',
    paddingLeft: vars.space[4],
    paddingRight: vars.space[4],
    height: '28px',
    borderRadius: vars.radii.medium,
    '@media': {
      [mediaBreakpointTablet]: {
        fontSize: vars.fontSizes.body,
        height: '36px',
      },
    },
    selectors: {
      '&::after': {
        content: '""',
        backgroundColor: 'black',
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        opacity: 0,
      },
      '&:hover::after': {
        opacity: 0.14,
      },
      '&:active::after': {
        opacity: 0.34,
      },
      '&:focus-visible::after': {
        opacity: 0.34,
      },
    },
  }),
  variants: {
    raised: {
      true: {
        boxShadow: vars.shadows.raised,
        transition: 'box-shadow 280ms cubic-bezier(0.4, 0, 0.2, 1) 0s',
      },
    },
    outlined: {
      true: {
        borderColor: vars.colors.surface,
      },
    },
    standard: {
      true: {
        borderColor: 'transparent',
      },
    },
    action: {
      true: {
        height: '56px',
        position: 'fixed',
        bottom: vars.space[4],
        right: vars.space[4],
        minWidth: 'auto',
      },
    },
    as: {
      ...typeVariants,
    },
    use: {
      primary: {
        backgroundColor: vars.colors.primary,
        color: vars.colors.onPrimary,
        borderColor: vars.colors.primary,
        selectors: {
          '&::after': {
            backgroundColor: vars.colors.onPrimary,
          },
          '&[disabled]': {
            backgroundColor: vars.colors.onSurface,
            opacity: 0.28,
            color: vars.colors.surface,
          },
        },
      },
      secondary: {},
      tertiary: {},
    },
  },
  compoundVariants: [
    {
      variants: {
        use: 'primary',
        outlined: true,
      },
      style: {
        backgroundColor: 'transparent',
        color: vars.colors.primary,
        borderStyle: 'solid',
        borderWidth: '1px',
        borderColor: vars.colors.primary,
        selectors: {
          '&::after': {
            backgroundColor: vars.colors.onBackground,
          },
          '&[disabled]': {
            backgroundColor: vars.colors.background,
            color: vars.colors.onSurface,
          },
        },
      },
    },
    {
      variants: {
        use: 'primary',
        standard: true,
      },
      style: {
        backgroundColor: 'transparent',
        color: vars.colors.primary,
        border: 'none',
        selectors: {
          '&::after': {
            backgroundColor: vars.colors.onBackground,
          },
          '&[disabled]': {
            backgroundColor: vars.colors.background,
            color: vars.colors.onSurface,
          },
        },
      },
    },
  ],
  defaultVariants: {
    as: 'button',
    use: 'primary',
    standard: true,
  },
})

export const label = style({
  position: 'relative',
  display: 'inline-flex',
  gap: vars.space[2],
})

export type ButtonVariants = RecipeVariants<typeof variants>
