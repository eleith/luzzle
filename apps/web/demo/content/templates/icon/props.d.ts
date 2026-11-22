/** The subset of the host's icon props used by this example. No package imports required. */
export interface IconProps<Fields> {
	piece: { title: string }
	fields: Fields
	helpers: {
		getPieceImageUrl(
			image: string | undefined,
			minWidth: number,
			format: 'jpg' | 'png' | 'webp' | 'avif'
		): string | undefined
	}
}
