import { style } from '@vanilla-extract/css'
import { mediaBreakpointLaptop, mediaBreakpointTablet, vars } from '@luzzle/ui/css'

export const page = style({
	margin: vars.space[4],
	marginBottom: vars.space[8],
	'@media': {
		[mediaBreakpointTablet]: {
			width: '66.66666%',
			marginLeft: 'auto',
			marginRight: 'auto',
		},
		[mediaBreakpointLaptop]: {
			width: '50%',
			marginLeft: 'auto',
			marginRight: 'auto',
		},
	},
})

export const books = style({
	display: 'flex',
	gap: '3rem',
	flexWrap: 'wrap',
	justifyContent: 'center',
})
