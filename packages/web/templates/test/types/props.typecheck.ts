/**
 * Compile-only tests: TypeScript checks every function body; nothing executes.
 * Accepted scenarios must compile. Each @ts-expect-error marks a rejected input
 * that must remain invalid. Exporting the scenarios avoids unused-variable noise.
 */
import type { PublicWebPiece, PieceIconPalette } from '@luzzle/web.pieces';
import type {
	PiecePageProps,
	PieceIconProps,
	PieceIconInputs,
	PieceIconOptions,
	PieceOpengraphProps
} from '@luzzle/web.templates/pieces/props';
import type {
	RootPageProps,
	FeedPageProps,
	FeedReference,
	ErrorPageProps
} from '@luzzle/web.templates/site/props';
import type { NavBannerInputs, PageComponents } from '@luzzle/web.templates/components/props';
import type { TemplateHelpers } from '@luzzle/web.templates/helpers';

// Typed stand-ins, not real archive records. Both type names are arbitrary.
declare const piece: PublicWebPiece & { type: 'custom-kind' };
declare const otherPiece: PublicWebPiece & { type: 'another-kind' };
declare const helpers: TemplateHelpers;
declare const components: PageComponents;

// Accepted template inputs -----------------------------------------------------

export function acceptsIconCallWithoutOptionalDefaults(): PieceIconInputs<'custom-kind'> {
	return { piece, size: { width: 80 } };
}

export function acceptsIconPropsWithResolvedOptions(): PieceIconProps<'custom-kind'> {
	return {
		data: { piece },
		options: { size: { width: 80, height: 120 }, lazy: false, active: true },
		helpers
	};
}

export function acceptsPiecePageWithNormalizedTags(): PiecePageProps<'custom-kind'> {
	return {
		data: { piece, tags: [{ tag: 'quick note', slug: 'quick-note' }] },
		helpers,
		components
	};
}

export function acceptsOpengraphProps(): PieceOpengraphProps<'another-kind'> {
	return {
		data: { piece: otherPiece },
		options: { size: { width: 1200, height: 630 } },
		helpers
	};
}

export function acceptsRootPageWithMixedPieceTypes(): RootPageProps {
	return {
		data: { types: ['custom-kind', 'another-kind'], pieces: [piece, otherPiece] },
		helpers,
		components
	};
}

export function acceptsTagFeed(): FeedPageProps {
	return {
		data: {
			feed: { url: '/tags/quick-note', type: 'tag', label: 'Quick note' },
			pieces: [piece, otherPiece]
		},
		helpers,
		components
	};
}

export function acceptsPublicErrorPage(): ErrorPageProps {
	return { data: { status: 404, message: 'Not found' }, helpers, components };
}

export function preservesCanonicalPieceShape(page: PiecePageProps): PublicWebPiece {
	return page.data.piece;
}

export function helpersReturnExpectedValues(): {
	url: string;
	palette: PieceIconPalette | undefined;
	image: string | undefined;
	asset: string | undefined;
	content: string | undefined;
	staticAsset: string | undefined;
} {
	const bound = helpers.forPiece(piece);
	return {
		url: bound.getUrl(),
		palette: bound.getPalette(),
		image: bound.getImageUrl(null, 80, 'avif'),
		asset: bound.getAssetUrl('attachment', 'image.original'),
		content: bound.getAssetContent('body', 'markdown'),
		staticAsset: helpers.getStaticAssetUrl('images/logo.svg')
	};
}

// Rejected icon inputs --------------------------------------------------------

export function rejectsIconCallWithoutSize(): PieceIconInputs {
	// @ts-expect-error Every icon component call requires a size.
	return { piece };
}

export function rejectsIconCallWithWrongPieceType(): PieceIconInputs<'custom-kind'> {
	// @ts-expect-error The requested type must match the supplied piece.
	return { piece: otherPiece, size: { width: 80 } };
}

export function rejectsAuthoredIconWithoutResolvedHeight(): PieceIconOptions {
	// @ts-expect-error Authored icons require height; only callers may omit it.
	return { size: { width: 80 }, lazy: false, active: false };
}

export function rejectsAuthoredIconWithoutDefaults(): PieceIconOptions {
	// @ts-expect-error Authored icons require explicit lazy and active values.
	return { size: { width: 80, height: 120 } };
}

// Props unavailable to a role --------------------------------------------------

export function rejectsLegacyFlatPieceProp(page: PiecePageProps): unknown {
	// @ts-expect-error The piece belongs under data.piece, not page.piece.
	return page.piece;
}

export function rejectsPageOptions(page: PiecePageProps): unknown {
	// @ts-expect-error Piece pages have no options prop.
	return page.options;
}

export function rejectsIconComponents(icon: PieceIconProps): unknown {
	// @ts-expect-error Icons cannot request navigation or nested piece icons.
	return icon.components;
}

export function rejectsSeparateIconTags(icon: PieceIconProps): unknown {
	// @ts-expect-error Icons have no separate tags prop.
	return icon.tags;
}

export function rejectsOpengraphComponents(opengraph: PieceOpengraphProps): unknown {
	// @ts-expect-error Open Graph images receive no page components.
	return opengraph.components;
}

// Rejected content and helper inputs ------------------------------------------

export function rejectsDatabaseEncodedTags(): PiecePageProps {
	return {
		data: {
			piece,
			// @ts-expect-error Page tags must be normalized { tag, slug } records.
			tags: ['quick note']
		},
		helpers,
		components
	};
}

export function rejectsPieceTypeAsFeedKind(): FeedReference {
	// @ts-expect-error Feed kind is 'piece' or 'tag', not a piece type name.
	return { url: '/feed', type: 'custom-kind', label: 'Feed' };
}

export function rejectsCustomNavigationSlots(): NavBannerInputs {
	// @ts-expect-error Navigation does not accept custom snippet slots.
	return { items: {} };
}

export function rejectsUnsupportedImageFormat(): string | undefined {
	// @ts-expect-error Image formats are limited to jpg, avif, webp, and png.
	return helpers.forPiece(piece).getImageUrl('cover', 80, 'gif');
}

export function rejectsNumericAssetKey(): string | undefined {
	// @ts-expect-error Asset keys must be strings (or null/undefined for images).
	return helpers.forPiece(piece).getImageUrl(12, 80, 'jpg');
}
