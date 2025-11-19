import type { WebPieces, WebPieceTags } from "./sqlite.js"
import type { Component } from "svelte"

type PieceIconProps = {
	piece: WebPieces & { frontmatter: Record<string, unknown>; tags: string[] }
	size: {
		width: number
		height?: number
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

type PiecePageProps = {
	piece: WebPieces
	tags: WebPieceTags
	metadata: Record<string, unknown>
	html_note: string | null
	helpers: PieceComponentHelpers
	Icon: Component<PieceIconProps>
}

export {
	type PieceIconProps,
	type PieceIconPalette,
	type PieceComponentHelpers,
	type PieceOpengraphProps,
	type PiecePageProps,
}
