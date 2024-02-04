import { style, createVar } from '@vanilla-extract/css'

export const articleCssVariables = {
	width: createVar(),
	height: createVar(),
	textColor: createVar(),
	borderRadius: createVar(),
	backgroundColor: createVar(),
	fontSize: createVar(),
	imgHeight: createVar(),
	imgBackgroundColor: createVar(),
}

export const articleShadowStyles = style({
	position: 'absolute',
	top: 0,
	left: 0,
	width: articleCssVariables.width,
	height: articleCssVariables.height,
	borderTopRightRadius: articleCssVariables.borderRadius,
	borderBottomRightRadius: articleCssVariables.borderRadius,
	selectors: {
		'html[data-theme="light"] &': {
			boxShadow: '-11px 11px 15px rgba(0, 0, 0, 0.35)',
		},
		'html[data-theme="dark"] &': {
			boxShadow: '-11px 11px 15px black',
		},
	},
})

export const articleImageStyles = style({
	position: 'relative',
	display: 'flex',
	justifyContent: 'center',
	overflow: 'hidden',
	background: articleCssVariables.imgBackgroundColor,
})

export const articleTitleStyles = style({
	padding: '10px',
	textAlign: 'center',
})

export const articleImageBackgroundStyles = style({
	position: 'absolute',
	top: '0px',
	left: '0px',
	right: '0px',
	bottom: '0px',
	filter: 'blur(2px)',
	opacity: '0.3',
	transform: 'scale(1.1)',
})

export const articleHeaderStyles = style({
	background: articleCssVariables.textColor,
	opacity: '0.5',
	height: '20px',
})

export const articleBlockStyles = style({
	background: articleCssVariables.textColor,
	height: '3px',
	borderRadius: '3px',
	marginBottom: '10px',
	width: '100%',
	selectors: {
		'&:nth-child(6n+6)': {
			marginBottom: '20px',
			width: '50%',
		},
	},
})

export const articleBlockContainerStyles = style({
	display: 'flex',
	flexDirection: 'column',
	justifyItems: 'right',
	alignItems: 'flex-end',
	padding: '10px',
	overflow: 'hidden',
})

export const articleContainerStyles = style({
	width: articleCssVariables.width,
	height: articleCssVariables.height,
	overflow: 'hidden',
	backgroundColor: articleCssVariables.backgroundColor,
	color: articleCssVariables.textColor,
	borderRadius: articleCssVariables.borderRadius,
	fontSize: articleCssVariables.fontSize,
})

export const articlePageStyles = style({
	position: 'relative',
})
