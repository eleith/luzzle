import { style } from '@vanilla-extract/css'
import { vars } from '@luzzle/ui/css'

export const pieceCard = style({
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
