import type { PublicWebPieceAsset } from '@luzzle/web.db'
import type { PieceFrontMatterValue } from '@luzzle/core'

export type PieceIconPalette = {
	accent?: string
	background?: string
	bodyText?: string
	muted?: string
	titleText?: string
}

export type PieceComponentHelpers = {
	getPieceUrl: () => string
	getPieceImageUrl: (
		image: PieceFrontMatterValue | string | undefined | null,
		minWidth: number,
		format: 'jpg' | 'avif' | 'webp' | 'png'
	) => string | undefined
	getPiecePalette: () => PieceIconPalette | undefined
	getPieceAssetUrl: (key: string, transform: string) => string | undefined
	getPieceAssetContent: (key: string, transform: string) => string | undefined
}

export function getPieceTags(keywords?: string | null): string[] {
	if (!keywords) return []
	try {
		const tags: unknown = JSON.parse(keywords)
		return Array.isArray(tags) ? tags.filter((tag): tag is string => typeof tag === 'string') : []
	} catch {
		return []
	}
}

export function safeExternalUrl(value?: string): string | undefined {
	if (!value) return undefined
	try {
		const url = new URL(value)
		return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? url.href : undefined
	} catch {
		return undefined
	}
}

/** Map a value between ranges, clamping to the output endpoints. */
export function interpolate(
	value: number,
	input: { min: number; max: number },
	output: { min: number; max: number }
): number {
	if (value <= input.min) return output.min
	if (value >= input.max) return output.max
	const progress = (value - input.min) / (input.max - input.min)
	return Number((output.min + (output.max - output.min) * progress).toFixed(2))
}

export function formatPieceDate(value?: string | number | null): string | undefined {
	if (value == null) return undefined
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return undefined
	return date.toLocaleDateString('en-US', { timeZone: 'UTC' }).replaceAll('/', '.')
}

export function formatPieceYear(value?: string | number | null): number | undefined {
	if (value == null) return undefined
	const date = new Date(value)
	return Number.isNaN(date.getTime()) ? undefined : date.getUTCFullYear()
}

export function formatTrackDuration(seconds?: number | null): string | undefined {
	if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return undefined
	const rounded = Math.round(seconds)
	return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, '0')}`
}

/** Shared date/duration formatting; layouts and field mappings remain template-owned. */
export function formatPieceByline(
	dateConsumed?: number | null,
	dateReleased?: string | number,
	runtime?: number
): string {
	const parts: string[] = []
	const released = formatPieceYear(dateReleased)
	if (released !== undefined) parts.push(String(released))
	if (runtime !== undefined) parts.push(`${runtime} min`)
	const consumed = formatPieceDate(dateConsumed)
	if (consumed) parts.push(consumed)
	return parts.join(' · ')
}

export function getOpengraphTitleSize(title: string): number {
	if (title.length < 10) return 5
	if (title.length < 20) return 4
	if (title.length < 40) return 3.2
	return 2.5
}

export const OpengraphImageWidth = 1200
export const OpengraphImageHeight = 630

export function createPieceHelpers(
	assets: PublicWebPieceAsset[],
	buildAssetUrl: (assetPath: string) => string,
	buildPieceUrl: () => string
): PieceComponentHelpers {
	const getPiecePalette = () => {
		const paletteAsset = assets.find((a) => a.transformation === 'palette')
		return paletteAsset?.content
			? (JSON.parse(paletteAsset.content) as PieceIconPalette)
			: undefined
	}

	return {
		getPieceUrl: buildPieceUrl,

		getPieceAssetUrl: (key: string, transform: string) => {
			const asset = assets.find((a) => a.asset_key === key && a.transformation === transform)
			return asset?.asset_path ? buildAssetUrl(asset.asset_path) : undefined
		},

		getPieceAssetContent: (key: string, transform: string) => {
			const asset = assets.find((a) => a.asset_key === key && a.transformation === transform)
			return asset?.content
		},

		getPieceImageUrl: (
			assetKey: PieceFrontMatterValue | string | undefined | null,
			minWidth: number,
			format: 'jpg' | 'avif' | 'webp' | 'png'
		) => {
			const size = minWidth <= 125 ? 's' : minWidth <= 250 ? 'm' : minWidth <= 500 ? 'l' : 'xl'
			const transformation = `image.${size}.${format}`
			const matched = assets.filter((asset) => asset.asset_key === assetKey)

			const transformed = matched.find((a) => a.transformation === transformation)?.asset_path
			if (transformed) return buildAssetUrl(transformed)

			const original = matched.find((a) => a.transformation === 'image.original')?.asset_path
			if (original) return buildAssetUrl(original)

			return undefined
		},

		getPiecePalette
	}
}
