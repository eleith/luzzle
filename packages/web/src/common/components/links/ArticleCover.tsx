/* eslint-disable @next/next/no-img-element */
import { Box } from '@luzzle/ui/components'
import { assignInlineVars } from '@vanilla-extract/dynamic'
import * as styles from './styles.css'

function getArticleContainerVanillaStyles(
	width: number,
	height: number,
	backgroundColor: string,
	textColor: string,
	radius: number,
	fontSize: number,
	imgBackgroundColor: string,
	imgHeight: number
) {
	const articleCssVariables = assignInlineVars(styles.articleCssVariables, {
		width: `${width}px`,
		height: `${height}px`,
		textColor: `${textColor}`,
		borderRadius: `${radius}px`,
		backgroundColor,
		fontSize: `${fontSize}px`,
		imgBackgroundColor,
		imgHeight: `${imgHeight}px`,
	})

	return {
		variables: articleCssVariables,
		articlePage: styles.articlePageStyles,
		articleTitle: styles.articleTitleStyles,
		articleImage: styles.articleImageStyles,
		articleImageBackground: styles.articleImageBackgroundStyles,
		articleBlockContainer: styles.articleBlockContainerStyles,
		articleBlock: styles.articleBlockStyles,
		articleShadow: styles.articleShadowStyles,
		articleContainer: styles.articleContainerStyles,
		articleHeader: styles.articleHeaderStyles,
	}
}

export type ArticleCoverProps = {
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

function ArticleCover({
	title,
	imageUrl,
	backgroundColor = 'white',
	textColor = 'black',
	radius = 7,
	fontSize = 10,
	width = 400,
	height = width * 1.5,
	imgHeight = (width * 1.5) / 6,
	imgBackgroundColor = 'black',
	imgLoading = 'eager',
}: ArticleCoverProps): JSX.Element {
	const articleStyles = getArticleContainerVanillaStyles(
		width,
		height,
		backgroundColor,
		textColor,
		radius,
		fontSize,
		imgBackgroundColor,
		imgHeight
	)

	function coverImage(
		img: { avif?: string; jpg: string; webp?: string },
		height: number,
		loading: 'lazy' | 'eager' = 'eager'
	): JSX.Element {
		return (
			<Box className={articleStyles.articleImage}>
				<picture className={articleStyles.articleImageBackground}>
					{img.avif && <source srcSet={`${img.avif}`} type={`image/avif`} />}
					<img
						src={img.jpg}
						width={'100%'}
						height={height}
						loading={loading}
						alt="" // decorative
					/>
				</picture>
				<picture style={{ position: 'relative' }}>
					{img.avif && <source srcSet={`${img.avif}`} type={`image/avif`} />}
					<img
						src={img.jpg}
						height={height}
						loading={loading}
						alt="" // decorative
					/>
				</picture>
			</Box>
		)
	}

	function repeatBlock(times: number): JSX.Element[] {
		const blocks = []
		for (let i = 1; i <= times; i++) {
			blocks.push(<Box className={articleStyles.articleBlock} key={i} />)
		}
		return blocks
	}

	return (
		<Box style={articleStyles.variables} className={articleStyles.articlePage}>
			<Box className={articleStyles.articleContainer}>
				{title && <Box className={articleStyles.articleTitle}>{title}</Box>}
				{imageUrl && coverImage(imageUrl, imgHeight, imgLoading)}
				{!imageUrl && <Box className={articleStyles.articleHeader} />}
				<Box className={articleStyles.articleBlockContainer}>{repeatBlock(height / 20)}</Box>
			</Box>
			<Box className={articleStyles.articleShadow} />
		</Box>
	)
}

export default ArticleCover
