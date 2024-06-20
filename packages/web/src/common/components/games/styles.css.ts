import { style, createVar } from '@vanilla-extract/css'

export const cssVariables = {
	width: createVar(),
	height: createVar(),
	cartridgeColor: createVar(),
	borderRadius: createVar(),
	headerPatchGradient: createVar(),
	headerGapsGradient: createVar(),
}

export const containerStyles = style({
	width: cssVariables.width,
	filter: 'drop-shadow(0px 0px 4px #000)',
})

export const cartridgeTop = style({
	width: `calc(${cssVariables.width} * 0.9)`,
	height: `calc(${cssVariables.height} * 0.02)`,
	background: cssVariables.cartridgeColor,
	borderRadius: `${cssVariables.borderRadius} ${cssVariables.borderRadius} 0 0`,
	boxShadow: '0px -2px 0px #aaa',
})

export const cartridgeBody = style({
	width: cssVariables.width,
	background: cssVariables.cartridgeColor,
	borderRadius: `0 0 ${cssVariables.borderRadius} ${cssVariables.borderRadius}`,
	display: 'flex',
	justifyContent: 'space-between',
	alignItems: 'flex-end',
	backgroundImage: 'linear-gradient(transparent, #666)',
})

export const cartridgeLabelContainer = style({
	display: 'flex',
	flexDirection: 'column',
	alignItems: 'center',
})

export const cartridgeEnd = style({
	width: '5%',
	height: `calc(${cssVariables.height} * 0.35)`,
	background: '#5d5d5d',
	borderTop: '3px solid #444',
	':first-child': {
		borderRadius: `0 0 0 ${cssVariables.borderRadius}`,
	},
	':last-child': {
		borderRadius: `0 0 ${cssVariables.borderRadius} 0`,
	},
})

export const cartridgeGap = style({
	width: `calc(${cssVariables.width} * 0.74)`,
	height: `calc(${cssVariables.width} * 0.74)`,
	background: '#666',
	backgroundImage: 'linear-gradient(#666, #555)',
	borderRadius: cssVariables.borderRadius,
	display: 'flex',
	justifyContent: 'center',
	alignItems: 'center',
	borderTop: '2px solid #444',
	borderBottom: '2px solid #aaa',
	overflow: 'hidden',
})

export const arrowDown = style({
	borderTop: '1px solid #555',
	borderLeft: '1px solid transparent',
	borderRight: '1px solid transparent',
	borderWidth: `calc(${cssVariables.width} * 0.10)`,
	borderRadius: '10px',
	margin: '8px 0 8px 0',
	filter: 'drop-shadow(0 1px 0 #999) drop-shadow(0 -1px 0 #444)',
})

export const cartridgeHeader = style({
	justifyContent: 'center',
	width: `calc(${cssVariables.width} * 1)`,
	height: `calc(${cssVariables.height} * 0.12)`,
	background: cssVariables.headerPatchGradient,
	borderRadius: `0 ${cssVariables.cartridgeColor} 0 0`,
	display: 'flex',
	alignItems: 'center',
})

export const cartridgeHeaderPlain = style({
	justifyContent: 'center',
	width: `calc(${cssVariables.width} * 1)`,
	height: `calc(${cssVariables.height} * 0.08)`,
	borderRadius: `0 ${cssVariables.cartridgeColor} 0 0`,
	background: cssVariables.cartridgeColor,
	display: 'flex',
	alignItems: 'center',
})

export const cartridgeHeaderOverlay = style({
	width: '100%',
	height: '75%',
	background: cssVariables.headerGapsGradient,
	display: 'flex',
	justifyContent: 'center',
})

export const cartridgeBrand = style({
	width: '75%',
	height: '95%',
	backgroundColor: '#444',
	background: 'linear-gradient(#444 5%, #777 85%)',
	boxShadow: '0 5px 15px 10px #4448 inset,	0 -1px 0 1px #ddd inset, 0 1px 2px 2px #222 inset',
	border: `5px solid ${cssVariables.cartridgeColor}`,
	borderRadius: '75px',
	transform: 'translate(0, -3%)',
	display: 'flex',
	justifyContent: 'center',
	alignItems: 'center',
	color: cssVariables.cartridgeColor,
	textShadow: '1px 2px 1px #0005',
	overflow: 'hidden',
})

export const cartridgeBrandName = style({
	fontSize: '1em',
	letterSpacing: '0px',
})

export const cartridgeImageContainer = style({})

export const cartridgeImage = style({
	width: `calc(${cssVariables.width} * 0.67)`,
	height: `calc(${cssVariables.width} * 0.67)`,
	objectFit: 'cover',
	borderRadius: cssVariables.borderRadius,
	objectPosition: 'top',
})
