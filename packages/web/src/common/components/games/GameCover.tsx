import { Box } from '@luzzle/ui/components'
import { assignInlineVars } from '@vanilla-extract/dynamic'
import * as styles from './styles.css'

function getVanillaStyles(width: number, height: number, backgroundColor: string, radius: number) {
	const cartridgeCssVariables = assignInlineVars(styles.cssVariables, {
		width: `${width}px`,
		height: `${height}px`,
		borderRadius: `${radius}px`,
		cartridgeColor: backgroundColor,
		headerPatchGradient: `linear-gradient(${backgroundColor} 0 15%, transparent 15% 75%, ${backgroundColor} 75%), linear-gradient(90deg, transparent 0 1%, #444 1% 5%, #000 50%, #444 95% 99%, transparent 99%)`,
		headerGapsGradient: `repeating-linear-gradient(${backgroundColor} 0 8%, transparent 8% 16%), linear-gradient(#222 0% 11%, transparent 11% 19%, #222 24% 26%, transparent 26% 40%, #222 40% 42%, transparent 43% 52%, #222 56% 58%, transparent 58% 64%, #222 74% 70%, transparent 70%)`,
	})

	return {
		variables: cartridgeCssVariables,
		container: styles.containerStyles,
		cartridgeTop: styles.cartridgeTop,
		cartridgeBody: styles.cartridgeBody,
		cartridgeLabelContainer: styles.cartridgeLabelContainer,
		cartridgeEnd: styles.cartridgeEnd,
		cartridgeGap: styles.cartridgeGap,
		arrowDown: styles.arrowDown,
		cartridgeHeader: styles.cartridgeHeader,
		cartridgeHeaderPlain: styles.cartridgeHeaderPlain,
		cartridgeHeaderOverlay: styles.cartridgeHeaderOverlay,
		cartridgeBrand: styles.cartridgeBrand,
		cartridgeBrandName: styles.cartridgeBrandName,
		cartridgeImage: styles.cartridgeImage,
		cartridgeImageContainer: styles.cartridgeImageContainer,
	}
}

export type GameCoverProps = {
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
	title?: string
}

function GameCover({
	backgroundColor = '#8c8c8c',
	radius = 7,
	width = 300,
	height = width * 1.25,
	imageUrl,
	title,
}: GameCoverProps): JSX.Element {
	const cartridgeStyles = getVanillaStyles(width, height, backgroundColor, radius)

	function coverImage(
		img: { avif?: string; jpg: string; webp?: string },
		width: number,
		loading: 'lazy' | 'eager' = 'eager'
	): JSX.Element {
		return (
			<Box className={cartridgeStyles.cartridgeImageContainer}>
				<picture>
					{img.avif && <source srcSet={`${img.avif}`} type={`image/avif`} />}
					<img
						className={cartridgeStyles.cartridgeImage}
						src={img.jpg}
						width={width * 0.5}
						loading={loading}
						alt="" // decorative
					/>
				</picture>
			</Box>
		)
	}

	const header =
		width > 200 ? (
			<Box className={cartridgeStyles.cartridgeHeader}>
				<Box className={cartridgeStyles.cartridgeHeaderOverlay}>
					<Box className={cartridgeStyles.cartridgeBrand}>
						<Box>
							<span className={cartridgeStyles.cartridgeBrandName}>{title}</span>
						</Box>
					</Box>
				</Box>
			</Box>
		) : (
			<Box className={cartridgeStyles.cartridgeHeaderPlain}></Box>
		)

	return (
		<Box style={cartridgeStyles.variables} className={cartridgeStyles.container}>
			<Box className={cartridgeStyles.cartridgeTop}></Box>
			{header}
			<Box className={cartridgeStyles.cartridgeBody}>
				<Box className={cartridgeStyles.cartridgeEnd}></Box>
				<Box className={cartridgeStyles.cartridgeLabelContainer}>
					<Box className={cartridgeStyles.cartridgeGap}>
						{imageUrl && coverImage(imageUrl, width, 'eager')}
					</Box>
					<Box className={cartridgeStyles.arrowDown}></Box>
				</Box>
				<Box className={cartridgeStyles.cartridgeEnd}></Box>
			</Box>
		</Box>
	)
}

export default GameCover
