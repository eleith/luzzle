import { style, createVar } from '@vanilla-extract/css'

export const cssVariables = {
	width: createVar(),
	height: createVar(),
	posterBackColor: createVar(),
	borderRadius: createVar(),
}

export const containerStyles = style({
	width: cssVariables.width,
	height: cssVariables.height,
	filter: 'drop-shadow(0px 0px 4px #000)',
	backgroundColor: `${cssVariables.posterBackColor}`,
	borderRadius: `${cssVariables.borderRadius}`,
	display: 'flex',
	justifyContent: 'center',
	alignItems: 'center',
})

export const posterBody = style({})

export const posterImageContainer = style({})

export const posterImage = style({
	height: `calc(${cssVariables.height} * 0.9)`,
	objectFit: 'cover',
	objectPosition: 'top',
})
