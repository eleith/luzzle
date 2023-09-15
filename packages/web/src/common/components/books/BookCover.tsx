/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from 'react'
import { Box } from '@luzzle/ui/components'
import { assignInlineVars } from '@vanilla-extract/dynamic'
import * as styles from './styles.css'

function getBookContainerVanillaStyles(
	width: number,
	height: number,
	thickness: number,
	perspective: number,
	rotate: { x: number; y: number },
	backgroundColor: string,
	textColor: string,
	radius: number,
	pagesOffset: number,
	transitionDuration: number,
	isMoving: boolean
): {
	variables: ReturnType<typeof assignInlineVars>
	container: string
	book: string
	bookCover: string
	bookCoverLoading: string
	bookSpine: string
	bookPages: string
	bookPagesBottom: string
	bookPagesTop: string
	bookBack: string
	bookShadow: string
	bookFront: string
} {
	const rotated = rotate.x || rotate.y || isMoving

	const bookCssVariables = assignInlineVars(styles.bookCssVariables, {
		width: `${width}px`,
		height: `${height}px`,
		thickness: `${thickness}px`,
		textColor: `${textColor}`,
		borderRadius: `${radius}px`,
		pageOffset: `${pagesOffset}px`,
		transitionDuration: `${transitionDuration}s`,
		pageHeight: `calc(${height}px - 2 * ${pagesOffset}px)`,
		translate: `${width - thickness / 2 - pagesOffset}px`,
		transformThickness: `${-thickness}px`,
		backgroundColor: backgroundColor,
		perspective: rotated ? `${perspective}px` : 'none',
		transformStyle: rotated ? 'preserve-3d' : 'flat',
		transition: rotated ? `transform  ${transitionDuration}s ease` : 'none',
		transform: rotated ? `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)` : 'none',
		rotateDisplay: rotated ? 'block' : 'none',
	})

	return {
		variables: bookCssVariables,
		container: styles.bookContainerStyles,
		book: styles.bookStyles,
		bookPages: styles.bookPagesStyles,
		bookPagesBottom: styles.bookPagesBottomStyles,
		bookPagesTop: styles.bookPagesTopStyles,
		bookBack: styles.bookBackStyles,
		bookShadow: styles.bookShadowStyles,
		bookSpine: styles.bookSpineStyles,
		bookCover: styles.bookCoverStyles,
		bookCoverLoading: styles.coverLoadingStyles,
		bookFront: styles.bookFrontStyles,
	}
}

export type BookCoverProps = {
	children: JSX.Element
	perspective?: number
	transitionDuration?: number
	radius?: number
	thickness?: number
	backgroundColor?: string
	textColor?: string
	width?: number
	height?: number
	pagesOffset?: number
	backgroundImageUrl?: { jpg: string; avif?: string; webp?: string }
	loading?: boolean
	rotate?: { x: number; y: number }
	rotateInteract?: { x: number; y: number }
}

function BookCover({
	children,
	backgroundImageUrl,
	rotate = { x: 0, y: 0 },
	rotateInteract = rotate,
	perspective = 900,
	transitionDuration = 0.75,
	thickness = 50,
	backgroundColor = 'black',
	textColor = 'white',
	radius = 7,
	width = 200,
	height = 300,
	pagesOffset = 3,
	loading = false,
}: BookCoverProps): JSX.Element {
	const hasBackgroundImage = !!backgroundImageUrl
	const [isLoading, setLoading] = useState(hasBackgroundImage || loading)
	const [isMoving, setMoving] = useState(false)
	const [rotateTo, setRotate] = useState(rotate)

	// avoid objects as dependencies as they always differ
	useEffect(() => {
		setMoving(true)
		setRotate({ x: rotate.x, y: rotate.y })
	}, [rotate.x, rotate.y])

	const bookStyles = getBookContainerVanillaStyles(
		width,
		height,
		thickness,
		perspective,
		rotateTo,
		backgroundColor,
		textColor,
		radius,
		pagesOffset,
		transitionDuration,
		isMoving
	)

	const coverImage = (
		<Box className={isLoading ? bookStyles.bookCoverLoading : bookStyles.bookCover}>
			<Box className={styles.bookFrontStyles}>{children}</Box>
			{hasBackgroundImage && (
				<picture>
					<>
						{backgroundImageUrl?.avif && (
							<source srcSet={`${backgroundImageUrl?.avif}`} type={`image/avif`} />
						)}
						<img
							src={backgroundImageUrl.jpg}
							style={{ position: 'relative' }}
							width={width}
							height={height}
							alt="" // decorative
							onError={() => {
								setLoading(false)
							}}
							onLoad={() => {
								setLoading(false)
							}}
						/>
					</>
				</picture>
			)}
		</Box>
	)

	function stop(): void {
		if (rotate.x != rotateInteract.x || rotate.y != rotateInteract.y) {
			setMoving(true)
			setRotate(rotate)
		}
	}

	function start(): void {
		if (rotate.x != rotateInteract.x || rotate.y != rotateInteract.y) {
			setMoving(true)
			setRotate(rotateInteract)
		}
	}

	function end(): void {
		setMoving(false)
	}

	return (
		<Box style={bookStyles.variables} className={bookStyles.container}>
			<Box
				className={bookStyles.book}
				onMouseOver={start}
				onMouseLeave={stop}
				onTransitionEnd={end}
				onTouchStart={start}
				onTouchEnd={stop}
			>
				<Box className={bookStyles.bookShadow} />
				<Box className={bookStyles.bookSpine} />
				<Box className={bookStyles.bookPages} />
				<Box className={bookStyles.bookPagesBottom} />
				<Box className={bookStyles.bookPagesTop} />
				<Box className={bookStyles.bookBack} />
				<Box>{coverImage}</Box>
			</Box>
		</Box>
	)
}

export default BookCover
