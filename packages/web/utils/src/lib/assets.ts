import { WebPieces } from "./sqlite.js"
import { Component } from "svelte"

const ASSET_IMAGE_MATCHER = /\.(jpg|jpeg|png|webp|avif|gif)$/i
const ASSET_PATH_MATCHER = /^(?:.*[\\/])?(([^/\\]+?)(?:\.([^.]+))?)$/
const OpengraphImageWidth = 1200
const OpengraphImageHeight = 630
const ASSET_SIZES = {
	s: 125,
	m: 250,
	l: 500,
	xl: 1000,
} as const

function getOpenGraphPath(type: string, id: string) {
	return `${type}/${id}/opengraph.png`
}

function isImage(asset: string) {
	const match = asset.match(ASSET_PATH_MATCHER)
	const filename = match ? match[1] : asset
	return ASSET_IMAGE_MATCHER.test(filename)
}

function getAssetDir(type: string, id: string) {
	return `${type}/${id}`
}

function widthToSize(minWidth: number): keyof typeof ASSET_SIZES {
	if (minWidth <= ASSET_SIZES.s) {
		return 's'
	} else if (minWidth <= ASSET_SIZES.m) {
		return 'm'
	} else if (minWidth <= ASSET_SIZES.l) {
		return 'l'
	} else {
		return 'xl'
	}
}

function getImageAssetPath(
	type: string,
	id: string,
	asset: string,
	width: number,
	format: 'jpg' | 'avif'
) {
	const match = asset.match(ASSET_PATH_MATCHER)
	const filename = match ? match[1] : asset
	const basename = match ? match[2] : filename
	const dir = getAssetDir(type, id)
	const size = widthToSize(width)

	return `${dir}/${basename}.${size}.${format}`
}

function getAssetPath(type: string, id: string, asset: string) {
	const dir = getAssetDir(type, id)
	const match = asset.match(ASSET_PATH_MATCHER)
	/* v8 ignore next */
	const filename = match ? match[1] : asset

	return `${dir}/${filename}`
}

type PieceIconProps = {
	piece: WebPieces & { frontmatter: Record<string, unknown>; tags: string[] }
	size: {
		width: number
		height: number
	}
	lazy?: boolean
	helpers: PieceComponentHelpers
}

type PieceIconPalette = {
	accent: string
	background: string
	bodyText: string
	muted: string
	titleText: string
}

type PieceComponentHelpers = {
	getPieceUrl: () => string
	getPieceImageUrl: (image: string, minWidth: number, format: 'jpg' | 'avif') => string
}

type PieceOpengraphProps = {
	Icon?: Component<PieceIconProps>
	piece: WebPieces & { frontmatter: Record<string, unknown>; tags: string[] }
	size: {
		width: number
		height: number
	}
	palette?: PieceIconPalette
	helpers: PieceComponentHelpers
}

export {
	getOpenGraphPath,
	isImage,
	getAssetDir,
	widthToSize,
	getImageAssetPath,
	getAssetPath,
	ASSET_SIZES,
	ASSET_IMAGE_MATCHER,
	ASSET_PATH_MATCHER,
	OpengraphImageWidth,
	OpengraphImageHeight,
	type PieceIconProps,
	type PieceOpengraphProps,
	type PieceIconPalette,
	type PieceComponentHelpers,
}
