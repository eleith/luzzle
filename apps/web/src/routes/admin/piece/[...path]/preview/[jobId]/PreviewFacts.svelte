<script lang="ts">
	import type { ProgressPhase } from '$lib/components/progress.js'
	import { formatDuration, previewDuration } from './duration.js'

	interface Props {
		file: string
		type?: string
		status: string
		createdAt: string | null
		finishedAt: string | null
		phases?: ProgressPhase[]
	}

	let { file, type, status, createdAt, finishedAt, phases = [] }: Props = $props()

	const knownStatus = $derived(
		status === 'waiting' ||
			status === 'enqueued' ||
			status === 'running' ||
			status === 'completed' ||
			status === 'failed' ||
			status === 'expired'
	)

	function parseDate(value: string | null): Date | null {
		if (value === null) return null
		const date = new Date(value)
		return Number.isFinite(date.getTime()) ? date : null
	}

	const created = $derived(parseDate(createdAt))
	const finished = $derived(parseDate(finishedAt))
	const duration = $derived(previewDuration(phases, status, finishedAt))
</script>

<div class="overview-facts">
	<!-- Explicit roles preserve table semantics when mobile CSS changes display. -->
	<!-- svelte-ignore a11y_no_redundant_roles -->
	<table role="table">
		<caption>Preview</caption>
		<tbody role="rowgroup">
			<tr role="row">
				<th scope="row" role="rowheader">File</th>
				<td role="cell"><bdi dir="ltr" class="file" title={file}>{file}</bdi></td>
			</tr>
			<tr role="row">
				<th scope="row" role="rowheader">Type</th>
				<td role="cell">
					{#if type != null}{type}{:else}Unknown{/if}
				</td>
			</tr>
			<tr role="row">
				<th scope="row" role="rowheader">State</th>
				<td role="cell">
					<span class="status" data-status={knownStatus ? status : 'unknown'}>
						{#if status === 'waiting' || status === 'enqueued'}
							Queued
						{:else if status === 'running'}
							Building
						{:else if status === 'completed'}
							Completed
						{:else if status === 'failed'}
							Failed
						{:else if status === 'expired'}
							Expired
						{:else}
							{status}
						{/if}
					</span>
					{#if status === 'enqueued' || status === 'waiting'}
						<div class="status-sub">Waiting for worker…</div>
					{:else if status === 'expired'}
						<div class="status-sub">
							Assets are purged after 2 days. Re-run the preview from the editor.
						</div>
					{/if}
				</td>
			</tr>
			<tr role="row">
				<th scope="row" role="rowheader">Duration</th>
				<td role="cell">
					{#if duration !== null}
						{formatDuration(duration)}
						{#if status === 'running'}
							elapsed
						{:else if status === 'completed' || status === 'expired'}
							total time
						{:else if status === 'failed'}
							stopped at
						{/if}
					{:else}
						<span class="muted">Unknown</span>
					{/if}
				</td>
			</tr>
			<tr role="row">
				<th scope="row" role="rowheader">Created</th>
				<td role="cell">
					{#if created}
						<time datetime={created.toISOString()}
							>{created.toLocaleString('en-US', { timeZone: 'UTC' })} UTC</time
						>
					{:else}
						<span class="muted">Unknown</span>
					{/if}
				</td>
			</tr>
			<tr role="row">
				<th scope="row" role="rowheader">Finished</th>
				<td role="cell">
					{#if finished}
						<time datetime={finished.toISOString()}
							>{finished.toLocaleString('en-US', { timeZone: 'UTC' })} UTC</time
						>
					{:else}
						<span class="muted">Unknown</span>
					{/if}
				</td>
			</tr>
		</tbody>
	</table>
</div>

<style>
	.file {
		overflow-wrap: anywhere;
	}
	.muted,
	.status-sub {
		color: var(--color-on-surface-variant);
	}
	.status-sub {
		margin-top: var(--space-1);
		font-size: inherit;
	}
</style>
