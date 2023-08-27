import { style } from '@vanilla-extract/css'
import { vars } from '@luzzle/ui/css'

export const leftNavItems = style({
	padding: vars.space[5],
	display: 'flex',
	alignItems: 'left',
})

export const rightNavItems = style({
	padding: vars.space[5],
	display: 'flex',
	alignItems: 'right',
	gap: vars.space[5],
})

export const navItem = style({
	cursor: 'pointer',
	color: vars.colors.outline,
	// color: vars.colors.background,
	selectors: {
		'&:hover': {
			color: vars.colors.primary,
		},
	},
})

export const navItemInverted = style({
	color: vars.colors.background,
	selectors: {
		'&:hover': {
			color: vars.colors.onBackground,
		},
	},
})

export const banner = style({
	display: 'flex',
	justifyContent: 'space-between',
})

export const bannerInverted = style({
	background: vars.colors.surface,
})
