<script lang="ts">
	import { onMount, onDestroy } from 'svelte'
	import { page } from '$app/state'
	import type { LayoutProps } from './$types'

	import ArrowLeftIcon from 'virtual:icons/ph/arrow-left'
	import CheckCircleFill from 'virtual:icons/ph/check-circle-fill'
	import XCircleFill from 'virtual:icons/ph/x-circle-fill'
	import CircleNotchBold from 'virtual:icons/ph/circle-notch-bold'
	import MinusCircle from 'virtual:icons/ph/minus-circle'

	let { data, children }: LayoutProps = $props()

	type PreviewStatus = 'enqueued' | 'running' | 'completed' | 'failed' | 'expired'

	type PhaseProgress = {
		phase: string
		status: string
		started_at: number
		finished_at: number | null
		message: string | null
	}

	let status = $state<PreviewStatus>(
		data.status === 'waiting' ? 'enqueued' : data.status === 'expired' ? 'expired' : data.status
	)
	let errorMessage = $state(data.errorMessage ?? '')
	let phases = $state<PhaseProgress[]>([])

	let eventSource: EventSource | null = null

	const editorUrl = `/editor/piece/${data.file}/source`

	const pageUrl = `/editor/piece/${data.file}/preview/${data.jobId}`
	const iconUrl = `/editor/piece/${data.file}/preview/${data.jobId}/icon`
	const ogUrl = `/editor/piece/${data.file}/preview/${data.jobId}/og`

	function formatDuration(ms: number) {
		if (ms < 0) return '0s'
		const s = Math.floor(ms / 1000)
		if (s < 60) return `${s}s`
		const m = Math.floor(s / 60)
		const remS = s % 60
		return `${m}m ${remS}s`
	}

	function startWatching() {
		if (eventSource) eventSource.close()
		eventSource = new EventSource(`/api/preview/${data.jobId}/stream`)

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

	let overallDuration = $derived.by(() => {
		if (phases.length === 0) return 0
		const first = phases[0]
		const last = phases[phases.length - 1]
		if (!first.started_at) return 0
		const end = last.finished_at || Date.now()
		return end - first.started_at
	})
</script>

{#if status === 'completed'}
	<div class="preview-banner">
		<div class="preview-banner-left">
			<span class="preview-label">preview</span>
			<span class="preview-title">{data.piece?.title || ''}</span>
			<div class="preview-links">
				<a href={pageUrl} class="preview-link" class:active={page.url.pathname === pageUrl}>page</a>
				<a href={iconUrl} class="preview-link" class:active={page.url.pathname === iconUrl}>icon</a>
				<a
					href="{ogUrl}?html"
					class="preview-link"
					class:active={page.url.pathname === ogUrl && page.url.searchParams.has('html')}>og html</a
				>
				<a
					href={ogUrl}
					class="preview-link"
					class:active={page.url.pathname === ogUrl && !page.url.searchParams.has('html')}>og png</a
				>
			</div>
		</div>
		<a href={editorUrl} class="preview-back">
			<ArrowLeftIcon />
			back to editor
		</a>
	</div>
	{@render children()}
{:else}
	<section class="preview-status">
		<header class="preview-status-header">
			<a href={editorUrl} class="preview-back">
				<ArrowLeftIcon />
				back to editor
			</a>
			<h1>Preview</h1>
			<div class="meta">{data.file}</div>
		</header>

		<div class="status-card">
			<span class="status-icon-wrap status-{status}">
				{#if status === 'running'}
					<CircleNotchBold class="status-icon spin" />
				{:else if status === 'enqueued'}
					<CircleNotchBold class="status-icon" />
				{:else if status === 'failed' || status === 'expired'}
					<XCircleFill class="status-icon" />
				{:else}
					<span class="status-dot"></span>
				{/if}
			</span>

			<div class="status-text">
				{#if status === 'expired'}
					<div class="status-title">Preview expired</div>
					<div class="status-sub">
						Assets are purged after 2 days. Re-run the preview from the editor.
					</div>
				{:else if status === 'enqueued'}
					<div class="status-title">Enqueued</div>
					<div class="status-sub">Waiting for worker…</div>
				{:else if status === 'running'}
					<div class="status-title">Rendering preview</div>
					<div class="status-sub">{formatDuration(overallDuration)} elapsed</div>
				{:else if status === 'failed'}
					<div class="status-title">Preview failed</div>
					<div class="status-sub">{formatDuration(overallDuration)} stopped at</div>
				{/if}
			</div>
		</div>

		{#if errorMessage && status === 'failed'}
			<div class="error-strip">
				<XCircleFill class="error-icon" />
				<span>{errorMessage}</span>
			</div>
		{/if}

		{#if phases.length > 0}
			<div class="timeline">
				{#each phases as phase (phase.phase)}
					<div class="phase">
						<span class="phase-icon-wrap status-{phase.status}">
							{#if phase.status === 'completed'}
								<CheckCircleFill class="phase-icon" />
							{:else if phase.status === 'running'}
								<CircleNotchBold class="phase-icon spin" />
							{:else if phase.status === 'failed'}
								<XCircleFill class="phase-icon" />
							{:else if phase.status === 'skipped'}
								<MinusCircle class="phase-icon" />
							{:else}
								<span class="phase-dot"></span>
							{/if}
						</span>
						<span class="phase-name">{phase.phase}</span>
						{#if phase.message}
							<span class="phase-message" class:is-error={phase.status === 'failed'}>
								{phase.message}
							</span>
						{/if}
						<span class="phase-aside">
							{#if phase.started_at}
								<span class="phase-time">
									{formatDuration((phase.finished_at || Date.now()) - phase.started_at)}
								</span>
							{/if}
						</span>
					</div>
				{/each}
			</div>
		{/if}
	</section>
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

	.preview-banner-left {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		min-width: 0;
	}

	.preview-label {
		text-transform: uppercase;
		font-weight: 600;
		letter-spacing: 0.05em;
		flex-shrink: 0;
	}

	.preview-title {
		opacity: 0.8;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 200px;
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
		font-size: 14px;
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
		font-size: 28px;
		font-weight: var(--font-weight-bold);
		letter-spacing: -0.01em;
	}

	.preview-status-header .meta {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--color-on-surface-variant);
	}

	.status-card {
		display: flex;
		align-items: center;
		gap: var(--space-5);
		padding: var(--space-4) var(--space-5);
		background-color: var(--color-surface-container-lowest);
		border: 1px solid var(--color-outline-variant);
		border-radius: var(--radius-medium);
		margin-bottom: var(--space-5);
	}

	.status-icon-wrap {
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		color: var(--color-on-surface-variant);
	}

	.status-icon-wrap :global(.status-icon) {
		font-size: 26px;
	}

	.status-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		border: 1.5px solid var(--color-outline-variant);
	}

	.status-icon-wrap.status-running {
		color: var(--color-secondary);
	}

	.status-icon-wrap.status-enqueued {
		color: var(--color-tertiary);
	}

	.status-icon-wrap.status-failed {
		color: var(--color-error);
	}

	.status-title {
		font-size: 15px;
		font-weight: var(--font-weight-semibold);
		color: var(--color-on-surface);
	}

	.status-sub {
		margin-top: 2px;
		font-size: 12px;
		color: var(--color-on-surface-variant);
	}

	.error-strip {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		background-color: color-mix(in srgb, var(--color-error) 10%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-error) 35%, transparent);
		color: var(--color-error);
		font-size: 12px;
		border-radius: var(--radius-small);
		margin-bottom: var(--space-4);
	}

	.error-strip :global(.error-icon) {
		font-size: 14px;
		flex-shrink: 0;
	}

	.timeline {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.phase {
		padding: var(--space-2) var(--space-3);
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.phase-icon-wrap {
		width: 20px;
		height: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.phase-icon-wrap :global(.phase-icon) {
		font-size: 18px;
	}

	.phase-icon-wrap.status-completed {
		color: var(--color-primary);
	}

	.phase-icon-wrap.status-running {
		color: var(--color-secondary);
	}

	.phase-icon-wrap.status-failed {
		color: var(--color-error);
	}

	.phase-icon-wrap.status-skipped {
		color: var(--color-on-surface-variant);
	}

	.phase-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		border: 1.5px solid var(--color-outline-variant);
	}

	.phase-name {
		font-family: var(--font-mono);
		font-size: 13px;
		font-weight: var(--font-weight-medium);
		color: var(--color-on-surface);
		flex-shrink: 0;
	}

	.phase-message {
		font-size: 12px;
		color: var(--color-on-surface-variant);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		min-width: 0;
	}

	.phase-message.is-error {
		color: var(--color-error);
	}

	.phase-aside {
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: var(--space-3);
		flex-shrink: 0;
	}

	.phase-time {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--color-on-surface-variant);
		min-width: 36px;
		text-align: right;
	}

	.spin {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
</style>
