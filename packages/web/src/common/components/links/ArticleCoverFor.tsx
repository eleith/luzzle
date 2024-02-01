import config from '@app/common/config'
import ArticleCover, { ArticleCoverProps } from './ArticleCover'

type Link = {
	id: string
	slug: string
	title: string
	representativeImage?: string | null
}

const ArticleCoverSize = {
	SMALL: 'SMALL',
	MEDIUM: 'MEDIUM',
	LARGE: 'LARGE',
} as const

type ArticleCoverForProps = {
	asLink?: boolean
	link: Link
	size?: (typeof ArticleCoverSize)[keyof typeof ArticleCoverSize]
}

function getDimensions(size: (typeof ArticleCoverSize)[keyof typeof ArticleCoverSize]) {
	switch (size) {
		case ArticleCoverSize.SMALL:
			return {
				height: 150,
				width: 100,
				imgHeight: 45,
			}
		default:
			return {
				height: 600,
				width: 400,
				imgHeight: 150,
			}
	}
}

function getCoverUrl(slug: string, size = 125, type: 'webp' | 'avif' | 'jpg' = 'jpg'): string {
	const height = size <= 125 ? 125 : size <= 250 ? 250 : size <= 500 ? 500 : 1000
	return `${config.public.HOST_STATIC}/images/variants/links/representative_image/${slug}.h${height}.${type}`
}

function ArticleCoverFor({
	link,
	size = ArticleCoverSize.MEDIUM,
	...linkCoverProps
}: ArticleCoverForProps): JSX.Element {
	const dimensions = getDimensions(size)
	const coverUrl = {
		avif: getCoverUrl(link.slug, dimensions.imgHeight, 'avif'),
		jpg: getCoverUrl(link.slug, dimensions.imgHeight, 'jpg'),
	}

	const articleCoverProps: ArticleCoverProps = {
		...linkCoverProps,
		width: dimensions.width,
		height: dimensions.height,
		imageUrl: link.representativeImage ? coverUrl : undefined,
		imgHeight: link.representativeImage ? dimensions.imgHeight : undefined,
	}

	return <ArticleCover {...articleCoverProps} />
}

export default ArticleCoverFor
