<script lang="ts">
	import { resolve } from '$app/paths'
	import { encodeArchivePath } from '#lib/pieces/navigation.js'
	import PlusIcon from 'virtual:icons/ph/plus'
	import ArrowCircleUpIcon from 'virtual:icons/ph/arrow-circle-up'
	import FolderIcon from 'virtual:icons/ph/folder'
	import type { PageData } from './$types'

	let { data }: { data: PageData } = $props()

	function relativeTime(when: string | number): string {
		const diffSec = Math.round((new Date(when).getTime() - Date.now()) / 1000)
		const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

		const units: [Intl.RelativeTimeFormatUnit, number][] = [
			['year', 60 * 60 * 24 * 365],
			['month', 60 * 60 * 24 * 30],
			['week', 60 * 60 * 24 * 7],
			['day', 60 * 60 * 24],
			['hour', 60 * 60],
			['minute', 60]
		]

		for (const [unit, secondsInUnit] of units) {
			if (Math.abs(diffSec) >= secondsInUnit) {
				return rtf.format(Math.round(diffSec / secondsInUnit), unit)
			}
		}

		return rtf.format(diffSec, 'second')
	}

	const publishAge = $derived.by(() => {
		if (!data.lastPublish) return 'never'
		const when = data.lastPublish.finished_at ?? data.lastPublish.created_at
		return relativeTime(when).replace(/ ago$/, '')
	})
</script>

<svelte:head>
	<title>{data.meta.title}</title>
</svelte:head>

<section class="dashboard">
	<section class="dashboard-section">
		<h2 class="section-header">statistics</h2>
		<div class="stats-row">
			<div class="stat-card-wrapper">
				<a class="stat-card" href={resolve('pieces')}>
					<span class="stat-number">{data.pieceStats.total.toLocaleString()}</span>
					<span class="stat-label">pieces</span>
				</a>
				<a
					class="quick-add"
					href={resolve('admin/pieces/create')}
					aria-label="add piece"
					title="add piece"
				>
					<PlusIcon style="width: 1em; height: 1em;" />
				</a>
			</div>

			<div class="stat-card-wrapper">
				<a class="stat-card" href={resolve('admin/directory')}>
					<span class="stat-number">{data.fileCount.toLocaleString()}</span>
					<span class="stat-label">files</span>
				</a>
				<a
					class="quick-add"
					href={resolve('admin/directory')}
					aria-label="browse files"
					title="browse files"
				>
					<FolderIcon style="width: 1em; height: 1em;" />
				</a>
			</div>

			<div class="stat-card-wrapper">
				<a class="stat-card" href={resolve('admin/publish')}>
					<span class="stat-number">{publishAge}</span>
					<span class="stat-label">last published</span>
				</a>
				<a class="quick-add" href={resolve('admin/publish')} aria-label="publish" title="publish">
					<ArrowCircleUpIcon style="width: 1em; height: 1em;" />
				</a>
			</div>
		</div>
	</section>

	<section class="dashboard-section">
		<h2 class="section-header">pending publication</h2>
		{#if data.recentlyEditedPieces.length}
			<div class="table-card">
				<div class="recent-header" aria-hidden="true">
					<span>title</span>
					<span>type</span>
					<span>status</span>
				</div>
				<ul class="recent-list">
					{#each data.recentlyEditedPieces as piece (piece.id)}
						<li>
							<a
								class="recent-row"
								href={resolve('/(auth)/admin/piece/[...path]/source', {
									path: encodeArchivePath(piece.file_path)
								})}
							>
								<span class="recent-title">{piece.title}</span>
								<span class="recent-type meta-cell">{piece.type}</span>
								<span class="recent-status meta-cell">
									{#if piece.hasPublishedVersion}has changes{:else}draft{/if}
								</span>
							</a>
						</li>
					{/each}
				</ul>
			</div>
		{:else}
			<p class="empty-state">No pieces pending publication.</p>
		{/if}
	</section>

	<section class="dashboard-section">
		<h2 class="section-header">recently published</h2>
		{#if data.recentlyPublishedPieces.length}
			<div class="table-card">
				<div class="recent-header" aria-hidden="true">
					<span>title</span>
					<span>type</span>
					<span>published</span>
				</div>
				<ul class="recent-list">
					{#each data.recentlyPublishedPieces as piece (piece.id)}
						<li>
							<a
								class="recent-row"
								href={resolve('/(auth)/admin/piece/[...path]/source', {
									path: encodeArchivePath(piece.file_path)
								})}
							>
								<span class="recent-title">{piece.title || piece.slug}</span>
								<span class="recent-type meta-cell">{piece.type}</span>
								<span class="recent-updated meta-cell">
									{relativeTime(piece.last_published_at ?? piece.date_updated ?? piece.date_added)}
								</span>
							</a>
						</li>
					{/each}
				</ul>
			</div>
		{:else}
			<p class="empty-state">No published pieces yet.</p>
		{/if}
	</section>

	{#if data.pieceStats.byType.length}
		<section class="dashboard-section">
			<h2 id="piece-types-title" class="section-header">pieces by type</h2>
			<div class="table-card">
				<table class="type-table" aria-labelledby="piece-types-title">
					<thead>
						<tr>
							<th scope="col">type</th>
							<th scope="col" class="type-count">pieces</th>
							<th scope="col" class="type-actions">action</th>
						</tr>
					</thead>
					<tbody>
						{#each data.pieceStats.byType as { type, count } (type)}
							<tr>
								<th scope="row"><a href={resolve(`pieces/${type}`)} title={type}>{type}</a></th>
								<td class="type-count">{count.toLocaleString()}</td>
								<td class="type-actions">
									<a
										class="type-add"
										href={resolve(`admin/pieces/create?type=${type}`)}
										aria-label="add {type}"
										title="add {type}"
									>
										<PlusIcon aria-hidden="true" style="width: 1em; height: 1em;" />
									</a>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{/if}

	<section class="dashboard-section">
		<h2 class="section-header">setup</h2>
		<div class="stats-row">
			<a class="stat-card" href={resolve('admin/health')}>
				<span class="stat-number">{data.setup.pieceTypeCount}</span>
				<span class="stat-label">piece types</span>
			</a>

			<a class="stat-card" href={resolve('admin/health')}>
				<span class="stat-number">{data.setup.aiConfigured ? 'on' : 'off'}</span>
				<span class="stat-label">ai</span>
			</a>

			<a class="stat-card" href={resolve('admin/health')}>
				<span class="stat-number">{data.setup.authType ?? 'disabled'}</span>
				<span class="stat-label">auth</span>
			</a>

			<a class="stat-card" href={resolve('admin/health')}>
				<span class="stat-number">{data.setup.archiveSyncConfigured ? 'on' : 'off'}</span>
				<span class="stat-label">archive sync</span>
			</a>

			<a class="stat-card" href={resolve('admin/health')}>
				<span class="stat-number">{data.setup.cdnSyncConfigured ? 'on' : 'off'}</span>
				<span class="stat-label">cdn sync</span>
			</a>
		</div>
	</section>
</section>

<style>
	section.dashboard {
		--middle-column-width: 8rem;
		--last-column-width: 9rem;
		--column-gap: var(--space-3);
		--row-block-padding: var(--space-3);
		--row-inline-padding: var(--space-4);
		margin: var(--space-4);
		margin-bottom: var(--space-8);
		margin-left: auto;
		margin-right: auto;
		width: 85%;
		display: flex;
		flex-direction: column;
		gap: var(--space-8);
	}

	.dashboard-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		min-width: 0;
	}

	.section-header {
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
		color: var(--color-on-surface-variant);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		margin: 0;
	}

	.stats-row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
		gap: var(--space-4);
	}

	.stat-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		padding: var(--space-4);
		color: inherit;
		text-decoration: none;
		background: var(--color-surface-container-highest);
		border-radius: var(--radius-small);
		transition: background 0.1s ease-in-out;
	}

	.stat-card:hover {
		background: var(--color-surface-container-low);
	}

	.stat-number {
		font-size: var(--font-size-normal);
		font-weight: var(--font-weight-bold);
	}

	.stat-label {
		font-size: var(--font-size-xs);
		color: var(--color-on-surface-variant);
		text-transform: uppercase;
	}

	.stat-card-wrapper {
		position: relative;
		display: flex;
	}

	.stat-card-wrapper .stat-card {
		flex: 1;
	}

	.quick-add {
		position: absolute;
		z-index: 1;
		top: var(--space-2);
		right: var(--space-2);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: var(--radius-small);
		color: var(--color-on-surface-variant);
		transition:
			background 0.1s ease-in-out,
			color 0.1s ease-in-out;
	}

	.quick-add:hover {
		background: var(--color-surface-container-low);
		color: var(--color-primary);
	}

	.table-card {
		min-width: 0;
		overflow: hidden;
		background: var(--color-surface-container-highest);
		border-radius: var(--radius-small);
	}

	.type-table {
		width: 100%;
		table-layout: fixed;
		border-collapse: separate;
		border-spacing: 0;
		font: inherit;
		text-align: left;
	}

	.type-table th,
	.type-table td {
		padding: var(--row-block-padding) var(--row-inline-padding);
		text-align: left;
		vertical-align: middle;
		border-bottom: 1px solid var(--color-outline-variant);
	}

	.type-table th {
		font-weight: inherit;
	}

	.type-table thead {
		background: var(--color-surface-container-high);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
		color: var(--color-on-surface-variant);
	}

	.type-table tbody tr:last-child > * {
		border-bottom: none;
	}

	.type-table tbody tr:hover {
		background: var(--color-surface-container-low);
	}

	.type-table a {
		color: inherit;
		text-decoration: none;
	}

	.type-table th a {
		display: block;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.type-table a:hover {
		color: var(--color-primary);
		text-decoration: underline;
	}

	.type-table a:focus-visible {
		outline: auto;
		outline-offset: 2px;
	}

	/* Table cells include padding; the recent grid sizes its content tracks separately. */
	.type-count {
		width: calc(var(--middle-column-width) + var(--column-gap));
		font-size: var(--font-size-xs);
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}

	.type-actions {
		width: calc(var(--last-column-width) + 2 * var(--row-inline-padding));
	}

	.type-add {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: var(--radius-small);
	}

	.recent-header,
	.recent-row {
		display: grid;
		grid-template-columns: 1fr var(--middle-column-width) var(--last-column-width);
		gap: var(--column-gap);
		align-items: center;
		padding: var(--row-block-padding) var(--row-inline-padding);
	}

	.recent-header {
		background: var(--color-surface-container-high);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
		color: var(--color-on-surface-variant);
		border-bottom: 1px solid var(--color-outline-variant);
	}

	.recent-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.recent-row {
		color: inherit;
		text-decoration: none;
		border-bottom: 1px solid var(--color-outline-variant);
		transition: background 0.1s ease-in-out;
	}

	.recent-list li:last-child .recent-row {
		border-bottom: none;
	}

	.recent-row:hover {
		background: var(--color-surface-container-low);
	}

	.recent-row:focus-visible {
		outline: auto;
		outline-offset: -2px;
	}

	.empty-state {
		margin: 0;
		color: var(--color-on-surface-variant);
		font-size: var(--font-size-xs);
	}

	.recent-title {
		min-width: 0;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.meta-cell {
		color: var(--color-on-surface-variant);
		font-size: var(--font-size-xs);
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	@media screen and (min-width: 768px) {
		section.dashboard {
			width: clamp(500px, 66.6666%, 1000px);
		}
	}

	@media screen and (max-width: 640px) {
		.type-table {
			--middle-column-width: 5rem;
			--last-column-width: 3rem;
			--column-gap: var(--space-2);
			--row-inline-padding: var(--space-2);
		}

		.recent-header {
			display: none;
		}

		.recent-row {
			grid-template-columns: 1fr;
			grid-template-areas: 'title' 'type';
			row-gap: var(--space-1);
		}

		.recent-title {
			grid-area: title;
		}

		.recent-type {
			grid-area: type;
		}

		.recent-updated {
			display: none;
		}

		.recent-status {
			grid-column: 1;
		}
	}
</style>
