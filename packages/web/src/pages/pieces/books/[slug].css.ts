import { style } from '@vanilla-extract/css'
import { mediaBreakpointPhone, mediaBreakpointTablet, vars } from '@luzzle/ui/css'

export const bookContainer = style({
	position: 'relative',
	display: 'flex',
	margin: 'auto',
	gap: vars.space[5],
	justifyContent: 'space-between',
	width: '100%',
	'@media': {
		[mediaBreakpointTablet]: {
			width: `clamp(500px, 66.6666%, 1000px)`,
		},
	},
})

export const bookCard = style({
	display: 'flex',
	justifyContent: 'space-around',
	alignItems: 'center',
	paddingTop: vars.space[10],
	background: vars.colors.surface,
	clipPath: 'polygon(0 0, 100% 0, 100% 80%, 0 65%)',
	marginBottom: '-80px',
})

export const bookNote = style({
	display: 'flex',
	gap: vars.space[3],
	flexDirection: 'column',
})

export const navigation = style({
	color: vars.colors.background,
	selectors: {
		'&:hover': {
			color: vars.colors.surfaceInverse,
		},
	},
})

export const bookDiscuss = style({})

export const bookDetails = style({
	lineHeight: '1.5',
	width: '100%',
	paddingRight: vars.space['2.5'],
	paddingLeft: vars.space['2.5'],
})

export const showOnMobile = style({
	'@media': {
		[mediaBreakpointPhone]: {
			display: 'none',
		},
	},
})

export const hideOnMobile = style({
	display: 'none',
	'@media': {
		[mediaBreakpointPhone]: {
			display: 'unset',
		},
	},
})

export const book = style({
	marginBottom: vars.space[5],
	marginTop: vars.space[5],
})
