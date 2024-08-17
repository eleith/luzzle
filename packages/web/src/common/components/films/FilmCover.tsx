import { Box } from '@luzzle/ui/components'
import { assignInlineVars } from '@vanilla-extract/dynamic'
import * as styles from './styles.css'

function getVanillaStyles(width: number, height: number, backgroundColor: string, radius: number) {
	const posterCssVariables = assignInlineVars(styles.cssVariables, {
		width: `${width}px`,
		height: `${height}px`,
		borderRadius: `${radius}px`,
		posterBackColor: backgroundColor,
	})

	return {
		variables: posterCssVariables,
		container: styles.containerStyles,
		posterBody: styles.posterBody,
		posterImage: styles.posterImage,
		posterImageContainer: styles.posterImageContainer,
	}
}

export type FilmCoverProps = {
	radius?: number
	backgroundColor?: string
	textColor?: string
	fontSize?: number
	width?: number
	height?: number
	imageUrl?: { jpg: string; avif?: string; webp?: string }
	imgLoading?: 'lazy' | 'eager'
	imgHeight?: number
	imgBackgroundColor?: string
	title: string
}

function FilmCover({
	backgroundColor = '#ffffff',
	radius = 7,
	width = 300,
	height = width * 1.25,
	imageUrl,
	title,
}: FilmCoverProps): JSX.Element {
	const cartridgeStyles = getVanillaStyles(width, height, backgroundColor, radius)

	function coverImage(
		img: { avif?: string; jpg: string; webp?: string },
		width: number,
		loading: 'lazy' | 'eager' = 'eager'
	): JSX.Element {
		return (
			<Box className={cartridgeStyles.posterImageContainer}>
				<picture>
					{img.avif && <source srcSet={`${img.avif}`} type={`image/avif`} />}
					<img
						className={cartridgeStyles.posterImage}
						src={img.jpg}
						width={width * 0.9}
						loading={loading}
						alt="" // decorative
					/>
				</picture>
			</Box>
		)
	}

	function coverTitle(title: string): JSX.Element {
		return <Box className={cartridgeStyles.posterImageContainer}>{title}</Box>
	}

	return (
		<Box style={cartridgeStyles.variables} className={cartridgeStyles.container}>
			<Box className={cartridgeStyles.posterBody}>
				{imageUrl && coverImage(imageUrl, width, 'eager')}
				{!imageUrl && coverTitle(title)}
			</Box>
		</Box>
	)
}

export default FilmCover
