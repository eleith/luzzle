<script lang="ts">
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

	const publishStatus = $derived.by(() => {
		if (data.inFlightPublish) {
			return data.inFlightPublish.workflow_name === 'PublishAudit' ? 'auditing…' : 'publishing…'
		}
		if (!data.lastPublish) {
			return 'never'
		}
		const when = data.lastPublish.finished_at ?? data.lastPublish.created_at
		return `${data.lastPublish.status} · ${relativeTime(when)}`
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
				<a class="stat-card" href="/pieces">
					<span class="stat-number">{data.pieceStats.total.toLocaleString()}</span>
					<span class="stat-label">pieces</span>
				</a>
				<a class="quick-add" href="/admin/pieces/create" aria-label="add piece" title="add piece">
					<PlusIcon style="width: 1em; height: 1em;" />
				</a>
			</div>

			<div class="stat-card-wrapper">
				<a class="stat-card" href="/admin/directory">
					<span class="stat-number">{data.fileCount.toLocaleString()}</span>
					<span class="stat-label">files</span>
				</a>
				<a class="quick-add" href="/admin/directory" aria-label="browse files" title="browse files">
					<FolderIcon style="width: 1em; height: 1em;" />
				</a>
			</div>

			<div class="stat-card-wrapper">
				<a class="stat-card" href="/admin/publish">
					<span class="stat-number">{publishStatus}</span>
					<span class="stat-label">last publish</span>
				</a>
				<a class="quick-add" href="/admin/publish" aria-label="publish" title="publish">
					<ArrowCircleUpIcon style="width: 1em; height: 1em;" />
				</a>
			</div>
		</div>
	</section>

	{#if data.recentlyEditedPieces.length}
		<section class="dashboard-section">
			<h2 class="section-header">recently edited</h2>
			<div class="table-card">
				<div class="recent-header" aria-hidden="true">
					<span>title</span>
					<span>type</span>
					<span>updated</span>
				</div>
				<ul class="recent-list">
					{#each data.recentlyEditedPieces as piece (piece.id)}
						<li class="recent-row">
							<a class="recent-title" href="/admin/piece/{piece.file_path}/source">
								{piece.title || piece.slug}
							</a>
							<span class="recent-type meta-cell">{piece.type}</span>
							<span class="recent-updated meta-cell">
								{relativeTime(piece.date_updated ?? piece.date_added)}
							</span>
						</li>
					{/each}
				</ul>
			</div>
		</section>
	{/if}

	{#if data.pieceStats.byType.length}
		<section class="dashboard-section">
			<h2 class="section-header">pieces by type</h2>
			<div class="stats-row">
				{#each data.pieceStats.byType as { type, count } (type)}
					<div class="stat-card-wrapper">
						<a class="stat-card" href="/pieces/{type}">
							<span class="stat-number">{count.toLocaleString()}</span>
							<span class="stat-label">{type}</span>
						</a>
						<a
							class="quick-add"
							href="/admin/pieces/create?type={type}"
							aria-label="add {type}"
							title="add {type}"
						>
							<PlusIcon style="width: 1em; height: 1em;" />
						</a>
					</div>
				{/each}
			</div>
		</section>
	{/if}

	<section class="dashboard-section">
		<h2 class="section-header">setup</h2>
		<div class="stats-row">
			<a class="stat-card" href="/admin/health">
				<span class="stat-number">{data.setup.pieceTypeCount}</span>
				<span class="stat-label">piece types</span>
			</a>

			<a class="stat-card" href="/admin/health">
				<span class="stat-number">{data.setup.aiConfigured ? 'on' : 'off'}</span>
				<span class="stat-label">ai</span>
			</a>

			<a class="stat-card" href="/admin/health">
				<span class="stat-number">{data.setup.authType ?? 'disabled'}</span>
				<span class="stat-label">auth</span>
			</a>

			<a class="stat-card" href="/admin/health">
				<span class="stat-number">{data.setup.archiveSyncConfigured ? 'on' : 'off'}</span>
				<span class="stat-label">archive sync</span>
			</a>

			<a class="stat-card" href="/admin/health">
				<span class="stat-number">{data.setup.cdnSyncConfigured ? 'on' : 'off'}</span>
				<span class="stat-label">cdn sync</span>
			</a>
		</div>
	</section>
</section>

<style>
	section.dashboard {
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

	.recent-header,
	.recent-row {
		display: grid;
		grid-template-columns: 1fr 8rem 9rem;
		gap: var(--space-3);
		align-items: center;
		padding: var(--space-3) var(--space-4);
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
		border-bottom: 1px solid var(--color-outline-variant);
		transition: background 0.1s ease-in-out;
	}

	.recent-row:last-child {
		border-bottom: none;
	}

	.recent-row:hover {
		background: var(--color-surface-container-low);
	}

	.recent-title {
		min-width: 0;
		color: inherit;
		text-decoration: none;
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
	}
</style>
