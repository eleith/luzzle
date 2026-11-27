/** Author-facing piece fields. Use `fields` for mapped metadata and `helpers` for assets. */
type Piece = {
	key: string
	slug: string
	type: string
	title: string
	summary?: string | null
	note?: string | null
	/** JSON-encoded tag names. Pages also receive parsed `tags`. */
	keywords?: string | null
	date_added: number
	date_updated?: number | null
	date_consumed?: number | null
}

type Palette = {
	accent?: string
	background?: string
	bodyText?: string
	muted?: string
	titleText?: string
}

type AssetHelpers = {
	getPieceImageUrl(
		key: string | null | undefined,
		minWidth: number,
		format: 'jpg' | 'avif' | 'webp' | 'png'
	): string | undefined
	getPiecePalette(): Palette | undefined
	getPieceAssetUrl(key: string, transform: string): string | undefined
	getPieceAssetContent(key: string, transform: string): string | null | undefined
}

type DateHelper = {
	formatPieceDate(value?: string | number | null): string | undefined
}

type Range = { min: number; max: number }

type TemplateProps<Fields, Helpers> = { piece: Piece; fields: Fields; helpers: Helpers }

export type IconProps<Fields> = TemplateProps<Fields, AssetHelpers> & {
	size: { width: number; height?: number }
	lazy?: boolean
}

export type PageProps<Fields> = TemplateProps<
	Fields,
	AssetHelpers &
		DateHelper & {
			safeExternalUrl(value?: string): string | undefined
			interpolate(value: number, input: Range, output: Range): number
			requestNavBar(options: {
				background?: string
				color?: string
				hoverColor?: string
				showRandom?: boolean
			}): void
		}
> & { tags: { slug: string; tag: string }[] }

export type OpengraphProps<Fields> = TemplateProps<
	Fields,
	AssetHelpers & DateHelper & { getTitleSizeRem(title: string): number }
>
