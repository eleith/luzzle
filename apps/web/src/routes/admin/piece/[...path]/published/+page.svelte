<script lang="ts">
	import type { PageProps } from './$types'
	import PieceOverview from '$lib/pieces/viewer/PieceOverview.svelte'
	import { assetPathToUrl } from '$lib/pieces/assets'
	import { MarkdownPublicationStatus } from '$lib/pieces/types'
	let { data }: PageProps = $props()
	function fileUrl(path: string) {
		return assetPathToUrl(path, data.config.url.luzzle_assets || data.config.url.app)
	}
	const statusLabels: Record<MarkdownPublicationStatus, string> = {
		[MarkdownPublicationStatus.MATCHING]: 'Matches publish',
		[MarkdownPublicationStatus.CHANGED]: 'Unpublished changes',
		[MarkdownPublicationStatus.UNKNOWN]: 'Unknown'
	}
	const publishedAt = $derived(
		data.publication.lastPublishedAt === null ? null : new Date(data.publication.lastPublishedAt)
	)
</script>

<main id="main-content">
	<PieceOverview
		title={data.piece.title}
		assets={data.piece.assets}
		{fileUrl}
		assetsHeading="Published assets"
	>
		<div class="overview-facts">
			<!-- Explicit roles preserve table semantics when mobile CSS changes display. -->
			<!-- svelte-ignore a11y_no_redundant_roles -->
			<table role="table">
				<caption>Publication</caption>
				<tbody role="rowgroup">
					<tr role="row">
						<th scope="row" role="rowheader">Type</th>
						<td role="cell">{data.piece.type}</td>
					</tr>
					<tr role="row">
						<th scope="row" role="rowheader">Last publish</th>
						<td role="cell">
							{#if publishedAt}
								<time datetime={publishedAt.toISOString()}
									>{publishedAt.toLocaleString('en-US', { timeZone: 'UTC' })} UTC</time
								>
							{:else}
								<span class="muted">Unknown</span>
							{/if}
						</td>
					</tr>
					<tr role="row">
						<th scope="row" role="rowheader">State</th>
						<td role="cell">
							<span class="status" data-status={data.publication.markdownStatus}
								>{statusLabels[data.publication.markdownStatus]}</span
							>
						</td>
					</tr>
					<tr role="row">
						<th scope="row" role="rowheader">URL</th>
						<td role="cell">
							<a
								href={data.publishedUrl}
								target="_blank"
								rel="noopener noreferrer"
								class="truncated"
								title={data.publishedUrl}><bdi dir="ltr">{data.publishedUrl}</bdi></a
							>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</PieceOverview>
</main>

<style>
	.truncated {
		display: block;
		min-width: 0;
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		direction: rtl;
		text-align: left;
	}
	a {
		color: var(--color-primary);
	}
	.muted {
		color: var(--color-on-surface-variant);
	}
</style>
