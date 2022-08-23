import { style } from '@vanilla-extract/css'
import { RecipeVariants, recipe } from '@vanilla-extract/recipes'
import { vars } from '../../css'

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
    height: '36px',
    borderRadius: vars.radii.medium,
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
    disabled: {
      true: {},
    },
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
    as: {
      ...typeVariants,
    },
    use: {
      primary: {
        background: vars.colors.primary,
        color: vars.colors.onPrimary,
        selectors: {
          '&::after': {
            backgroundColor: vars.colors.onPrimary,
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
        background: vars.colors.background,
        color: vars.colors.onBackground,
        borderStyle: 'solid',
        borderWidth: '1px',
        borderColor: vars.colors.primary,
        selectors: {
          '&::after': {
            backgroundColor: vars.colors.onBackground,
          },
        },
      },
    },
  ],
  defaultVariants: {
    as: 'button',
    use: 'primary',
  },
})

export const label = style({
  position: 'relative',
})

export type ButtonVariants = RecipeVariants<typeof variants>
