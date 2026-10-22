import type {
	PiecePageProps as PreparedPageProps,
	PieceIconProps as PreparedIconProps
} from '@luzzle/web.templates/pieces/props'
import type { FeedPageProps as PreparedFeedProps } from '@luzzle/web.templates/site/props'
import type { PieceComponents as PreparedComponents } from '@luzzle/web.templates/components/props'
import type { PieceOpengraphProps as LegacyOpengraphProps } from '$lib/pieces/helpers'
import type {
	RootPageProps as LegacyRootProps,
	Page404Props as Legacy404Props,
	PageErrorProps as LegacyErrorProps
} from '$lib/content/types'

// Host-side names for sources copied into the remaining build-time surfaces.
// Author folders carry their own portable luzzle.d.ts, without workspace imports.
declare global {
	type PiecePageProps = PreparedPageProps
	type PieceIconProps = PreparedIconProps
	type PieceComponents = PreparedComponents
	type FeedPageProps = PreparedFeedProps

	// These consumers retain their existing contracts until their cutover.
	type PieceOpengraphProps = LegacyOpengraphProps
	type RootPageProps = LegacyRootProps
	type Page404Props = Legacy404Props
	type PageErrorProps = LegacyErrorProps
}
