import { style } from '@vanilla-extract/css'
import { vars } from '@luzzle/ui/css'
import { mediaBreakpointTablet, mediaBreakpointLaptop } from '@luzzle/ui/css'

export const gamesContainer = style({
	display: 'grid',
	width: '100%',
	margin: 'auto',
	marginTop: vars.space[10],
	marginBottom: vars.space[10],
	gridTemplateColumns: 'repeat(auto-fill, 280px)',
	gap: vars.space[5],
	alignItems: 'top',
	justifyContent: 'center',
	selectors: {
		'&::last-child': {
			marginRight: 'auto',
		},
	},
	'@media': {
		[mediaBreakpointTablet]: {},
		[mediaBreakpointLaptop]: {},
	},
})

export const gamesActions = style({
	textAlign: 'center',
	padding: `${vars.space[5]} 0 ${vars.space[5]} 0`,
})

export const gameCard = style({
	color: vars.colors.surface,
	cursor: 'pointer',
	textDecoration: 'none',
	minHeight: '200px',
	selectors: {
		'&:hover': {
			textDecoration: 'underline',
			color: vars.colors.primary,
		},
	},
})
