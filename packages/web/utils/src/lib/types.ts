import type { WebPieces, WebPieceTags } from "./sqlite.js"

type PieceIconProps = {
	piece: WebPieces
	metadata: Record<string, unknown>
	tags: string[]
	size: {
		width: number
		height?: number
	}
	lazy?: boolean
}

type PieceIconPalette = {
	accent?: string
	background?: string
	bodyText?: string
	muted?: string
	titleText?: string
}

type PieceComponentHelpers = {
	getPieceUrl: () => string
	getPieceImageUrl: (image: string, minWidth: number, format: 'jpg' | 'avif') => string
}

type PieceOpengraphProps = {
	metadata: Record<string, unknown>
	tags: string[]
	piece: WebPieces
	size: {
		width: number
		height: number
	}
	palette?: PieceIconPalette
}

type PiecePageProps = {
	piece: WebPieces
	metadata: Record<string, unknown>
	tags: Partial<WebPieceTags>[]
	html_note: string | null
}

export {
	type PieceIconProps,
	type PieceIconPalette,
	type PieceComponentHelpers,
	type PieceOpengraphProps,
	type PiecePageProps,
}
