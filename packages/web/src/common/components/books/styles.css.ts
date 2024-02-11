import { keyframes, style, createVar } from '@vanilla-extract/css'

export const bookCssVariables = {
	width: createVar(),
	height: createVar(),
	thickness: createVar(),
	textColor: createVar(),
	borderRadius: createVar(),
	pageOffset: createVar(),
	transitionDuration: createVar(),
	pageHeight: createVar(),
	translate: createVar(),
	transformThickness: createVar(),
	backgroundColor: createVar(),
	perspective: createVar(),
	transformStyle: createVar(),
	transform: createVar(),
	transition: createVar(),
	rotateDisplay: createVar(),
}

export const bookContainerStyles = style({
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'center',
	perspective: bookCssVariables.perspective,
	marginBottom: '11px',
	isolation: 'isolate',
})

const pulse = keyframes({
	'0%': { backgroundColor: '#494949' },
	'100%': { backgroundColor: bookCssVariables.backgroundColor },
})

export const coverLoadingStyles = style({
	position: 'absolute',
	top: '0px',
	left: '0px',
	bottom: '0px',
	right: '0px',
	animationName: `${pulse}`,
	animationDuration: '500ms',
	animationDirection: 'alternate',
	animationIterationCount: 'infinite',
	animationTimingFunction: 'ease-in-out',
})

export const bookStyles = style({
	width: bookCssVariables.width,
	height: bookCssVariables.height,
	position: 'relative',
	color: bookCssVariables.textColor,
	transformStyle: bookCssVariables.transformStyle,
	transition: bookCssVariables.transition,
	transform: bookCssVariables.transform,
})

export const bookPagesStyles = style({
	display: bookCssVariables.rotateDisplay,
	position: 'absolute',
	left: 0,
	top: bookCssVariables.pageOffset,
	width: `calc(${bookCssVariables.thickness} - 2px)`,
	height: bookCssVariables.pageHeight,
	transform: `translateX(${bookCssVariables.translate}) translateZ(calc(0px - ${bookCssVariables.thickness} / 2)) rotateY(90deg)`,
	background: `linear-gradient(90deg,
      #fff 0%,
      #f9f9f9 5%,
      #fff 10%,
      #f9f9f9 15%,
      #fff 20%,
      #f9f9f9 25%,
      #fff 30%,
      #f9f9f9 35%,
      #fff 40%,
      #f9f9f9 45%,
      #fff 50%,
      #f9f9f9 55%,
      #fff 60%,
      #f9f9f9 65%,
      #fff 70%,
      #f9f9f9 75%,
      #fff 80%,
      #f9f9f9 85%,
      #fff 90%,
      #f9f9f9 95%,
      #fff 100%
      )`,
})

export const bookPagesBottomStyles = style({
	display: bookCssVariables.rotateDisplay,
	position: 'absolute',
	left: 1,
	bottom: 0,
	width: `calc(${bookCssVariables.width} - 4px)`,
	height: bookCssVariables.thickness,
	transform: `translateY(calc(${bookCssVariables.thickness} / 2 - 5px)) translateZ(calc(0px - ${bookCssVariables.thickness} / 2)) rotateX(270deg)`,
	background: `linear-gradient(0deg,
      #fff 0%,
      #f9f9f9 5%,
      #fff 10%,
      #f9f9f9 15%,
      #fff 20%,
      #f9f9f9 25%,
      #fff 30%,
      #f9f9f9 35%,
      #fff 40%,
      #f9f9f9 45%,
      #fff 50%,
      #f9f9f9 55%,
      #fff 60%,
      #f9f9f9 65%,
      #fff 70%,
      #f9f9f9 75%,
      #fff 80%,
      #f9f9f9 85%,
      #fff 90%,
      #f9f9f9 95%,
      #fff 100%
      )`,
})

export const bookPagesTopStyles = style({
	display: bookCssVariables.rotateDisplay,
	position: 'absolute',
	right: 1,
	top: 0,
	width: `calc(${bookCssVariables.width} - 4px)`,
	height: bookCssVariables.thickness,
	transform: `translateY(calc(0px - (${bookCssVariables.thickness} / 2 - 5px))) translateZ(calc(0px - ${bookCssVariables.thickness} / 2)) rotateX(270deg)`,
	background: `linear-gradient(0deg,
      #fff 0%,
      #f9f9f9 5%,
      #fff 10%,
      #f9f9f9 15%,
      #fff 20%,
      #f9f9f9 25%,
      #fff 30%,
      #f9f9f9 35%,
      #fff 40%,
      #f9f9f9 45%,
      #fff 50%,
      #f9f9f9 55%,
      #fff 60%,
      #f9f9f9 65%,
      #fff 70%,
      #f9f9f9 75%,
      #fff 80%,
      #f9f9f9 85%,
      #fff 90%,
      #f9f9f9 95%,
      #fff 100%
      )`,
})

export const bookSpineStyles = style({
	display: bookCssVariables.rotateDisplay,
	position: 'absolute',
	left: 0,
	top: 0,
	width: `calc(${bookCssVariables.thickness} - 2px)`,
	height: bookCssVariables.height,
	transform: `translateX(calc(0px - (${bookCssVariables.thickness} / 2 - 2px))) translateZ(calc(0px - ${bookCssVariables.thickness} / 2)) rotateY(-90deg)`,
	backgroundColor: bookCssVariables.backgroundColor,
})

export const bookBackStyles = style({
	display: bookCssVariables.rotateDisplay,
	position: 'absolute',
	top: 0,
	left: 0,
	width: bookCssVariables.width,
	height: bookCssVariables.height,
	transform: `translateZ(${bookCssVariables.transformThickness})`,
	backgroundColor: bookCssVariables.backgroundColor,
	borderTopRightRadius: bookCssVariables.borderRadius,
	borderBottomRightRadius: bookCssVariables.borderRadius,
})

export const bookFrontStyles = style({
	width: '100%',
	padding: '3px',
	position: 'absolute',
	textAlign: 'center',
	hyphens: 'auto',
})

export const bookShadowStyles = style({
	position: 'absolute',
	top: 0,
	left: 0,
	width: bookCssVariables.width,
	height: bookCssVariables.height,
	borderTopRightRadius: bookCssVariables.borderRadius,
	borderBottomRightRadius: bookCssVariables.borderRadius,
	selectors: {
		'html[data-theme="light"] &': {
			boxShadow: '-11px 11px 15px rgba(0, 0, 0, 0.35)',
		},
		'html[data-theme="dark"] &': {
			boxShadow: '-11px 11px 15px black',
		},
	},
})

export const bookCoverStyles = style({
	position: 'absolute',
	top: '0px',
	left: '0px',
	bottom: '0px',
	right: '0px',
	backgroundColor: bookCssVariables.backgroundColor,
	overflow: 'hidden',
	borderTopRightRadius: bookCssVariables.borderRadius,
	borderBottomRightRadius: bookCssVariables.borderRadius,
	display: 'flex',
	alignItems: 'center',
})
