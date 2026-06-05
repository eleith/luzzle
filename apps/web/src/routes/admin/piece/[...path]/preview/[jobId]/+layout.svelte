<script lang="ts">
	import { onMount, onDestroy } from 'svelte'
	import { page } from '$app/state'
	import type { LayoutProps } from './$types'

	import ArrowLeftIcon from 'virtual:icons/ph/arrow-left'
	import WorkflowConsole from './WorkflowConsole.svelte'

	let { data, children }: LayoutProps = $props()

	type PreviewStatus = 'enqueued' | 'running' | 'completed' | 'failed' | 'expired'

	type PhaseProgress = {
		phase: string
		status: string
		started_at: number
		finished_at: number | null
		message: string | null
	}
	type PhaseLog = {
		job_id: string
		phase: string
		line_number: number
		ts: number
		level: string
		message: string
	}

	let status = $state<PreviewStatus>(
		data.status === 'waiting' ? 'enqueued' : data.status === 'expired' ? 'expired' : data.status
	)
	let errorMessage = $state(data.errorMessage ?? '')

	const initialPhases = data.phases ?? []
	const initialLogs: Record<string, PhaseLog[]> = {}
	if (data.logs) {
		for (const log of data.logs) {
			if (!initialLogs[log.phase]) initialLogs[log.phase] = []
			initialLogs[log.phase].push(log)
		}
	}

	let phases = $state<PhaseProgress[]>(initialPhases)
	let logs = $state<Record<string, PhaseLog[]>>(initialLogs)

	let eventSource: EventSource | null = null

	const editorUrl = `/admin/piece/${data.file}/source`

	const logsUrl = `/admin/piece/${data.file}/preview/${data.jobId}`
	const pageUrl = `/admin/piece/${data.file}/preview/${data.jobId}/page`
	const iconUrl = `/admin/piece/${data.file}/preview/${data.jobId}/icon`
	const ogUrl = `/admin/piece/${data.file}/preview/${data.jobId}/og`

	function startWatching() {
		if (eventSource) eventSource.close()
		eventSource = new EventSource(`/api/admin/preview/${data.jobId}/stream`)

		eventSource.addEventListener('state', (e) => {
			const d = JSON.parse(e.data)
			if (d.state === 'running' || d.state === 'claimed') {
				status = 'running'
			} else if (d.state === 'waiting') {
				status = 'enqueued'
			}
		})

		eventSource.addEventListener('phase', (e) => {
			phases = JSON.parse(e.data)
		})

		eventSource.addEventListener('log', (e) => {
			const newLogs: PhaseLog[] = JSON.parse(e.data)
			const updated = { ...logs }
			for (const log of newLogs) {
				if (!updated[log.phase]) {
					updated[log.phase] = []
				}
				updated[log.phase] = [...updated[log.phase], log]
			}
			logs = updated
		})

		eventSource.addEventListener('done', (e) => {
			const d = JSON.parse(e.data)
			if (d.state === 'completed') {
				window.location.reload()
			} else {
				status = 'failed'
				if (d.errors && d.errors.length > 0) {
					errorMessage = d.errors[0]?.message || 'Preview failed'
				}
			}
			eventSource?.close()
			eventSource = null
		})

		eventSource.addEventListener('error', () => {
			// stream error, let the next reconnect cycle handle it
		})
	}

	onMount(() => {
		if (data.status === 'running' || data.status === 'waiting') {
			startWatching()
		}
	})

	onDestroy(() => {
		if (eventSource) eventSource.close()
	})
</script>

<header role="banner" class="preview-banner">
	<a href={editorUrl} class="preview-back">
		<ArrowLeftIcon />
	</a>
	<div class="preview-links">
		<a href={logsUrl} class="preview-link" class:active={page.url.pathname === logsUrl}>logs</a>
		<a
			href={status === 'completed' ? pageUrl : '#'}
			class="preview-link"
			class:active={page.url.pathname === pageUrl}
			class:disabled={status !== 'completed'}
			aria-disabled={status !== 'completed'}
		>
			page
		</a>
		<a
			href={status === 'completed' ? iconUrl : '#'}
			class="preview-link"
			class:active={page.url.pathname === iconUrl}
			class:disabled={status !== 'completed'}
			aria-disabled={status !== 'completed'}
		>
			icon
		</a>
		<a
			href={status === 'completed' ? ogUrl : '#'}
			class="preview-link"
			class:active={page.url.pathname === ogUrl && !page.url.searchParams.has('html')}
			class:disabled={status !== 'completed'}
			aria-disabled={status !== 'completed'}
		>
			og
		</a>
		{#if status === 'completed' && page.url.pathname === ogUrl && page.url.searchParams.has('html')}
			<a href="{ogUrl}?html" class="preview-link active">og (html)</a>
		{/if}
	</div>
	<span class="preview-label">preview</span>
</header>

{#if status === 'completed'}
	<main id="main-content" role="main">
		{@render children()}
	</main>
{:else}
	<main id="main-content" role="main" class="preview-status">
		<header class="preview-status-header">
			<h1>Preview</h1>
			<div class="meta">{data.file}</div>
		</header>

		<WorkflowConsole {status} {phases} {logs} {errorMessage} />
	</main>
{/if}

<style>
	.preview-banner {
		position: sticky;
		top: 0;
		z-index: 100;
		display: flex;
		justify-content: space-between;
		align-items: center;
		background-color: var(--color-tertiary-container);
		color: var(--color-on-tertiary-container);
		padding: var(--space-2) var(--space-4);
		font-size: var(--font-size-small);
	}

	.preview-label {
		text-transform: uppercase;
		font-weight: 600;
		letter-spacing: 0.05em;
		flex-shrink: 0;
		opacity: 0.7;
	}

	.preview-links {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.preview-link {
		color: inherit;
		text-decoration: none;
		text-transform: uppercase;
		font-size: 0.9em;
		opacity: 0.7;
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-small);
	}

	.preview-link:hover {
		opacity: 1;
		background-color: rgba(255, 255, 255, 0.1);
	}

	.preview-link.active {
		opacity: 1;
		font-weight: 600;
		background-color: rgba(255, 255, 255, 0.2);
	}

	.preview-link.disabled {
		opacity: 0.35;
		pointer-events: none;
		cursor: not-allowed;
	}

	.preview-back {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		color: inherit;
		text-decoration: none;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.preview-back:hover {
		text-decoration: underline;
	}

	.preview-status {
		padding: var(--space-8) var(--space-4);
		max-width: 860px;
		margin: 0 auto;
		color: var(--color-on-surface);
		font-size: var(--font-size-xs);
		line-height: 1.4;
	}

	.preview-status-header {
		margin-bottom: var(--space-5);
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.preview-status-header h1 {
		margin: 0;
		font-size: var(--font-size-normal);
		font-weight: var(--font-weight-bold);
		letter-spacing: -0.01em;
	}

	.preview-status-header .meta {
		font-family: var(--font-mono);
		font-size: var(--font-size-xxs);
		color: var(--color-on-surface-variant);
	}
</style>
