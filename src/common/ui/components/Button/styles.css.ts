import { style } from '@vanilla-extract/css'
import { RecipeVariants, recipe } from '@vanilla-extract/recipes'
import { vars } from '../../css'

const sizeVariants = {
  small: style({
    fontSize: vars.fontSizes.small,
  }),
  medium: style({
    fontSize: vars.fontSizes.medium,
  }),
  large: style({
    fontSize: vars.fontSizes.large,
  }),
}

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
    },
  }),
  variants: {
    size: {
      ...sizeVariants,
    },
    disabled: {
      true: {},
    },
    raised: {
      true: {
        paddingLeft: vars.space[4],
        paddingRight: vars.space[4],
        boxShadow: vars.shadows.raised,
        transition: 'box-shadow 280ms cubic-bezier(0.4, 0, 0.2, 1) 0s',
        height: '36px',
        borderRadius: vars.radii.medium,
      },
    },
    type: {
      ...typeVariants,
    },
    use: {
      primary: {},
      secondary: {},
      tertiary: {},
    },
  },
  compoundVariants: [
    {
      variants: {
        raised: true,
        use: 'primary',
      },
      style: {
        background: vars.colors.primary,
        color: vars.colors.onPrimary,
        selectors: {
          '&::after': {
            backgroundColor: vars.colors.onPrimary,
          },
        },
      },
    },
  ],
  defaultVariants: {
    size: 'small',
    type: 'button',
  },
})

export const label = style({
  position: 'relative',
})

export type ButtonVariants = RecipeVariants<typeof variants>
