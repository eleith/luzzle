<script lang="ts">
	import { tick } from 'svelte'
	import type { ProgressPhase, ProgressLog } from '#lib/components/progress.js'
	import LockSimpleFill from 'virtual:icons/ph/lock-simple-fill'
	import LockSimpleOpenFill from 'virtual:icons/ph/lock-simple-open-fill'

	type Props = {
		phase: ProgressPhase
		logs?: readonly (ProgressLog & { job_id?: string })[]
	}

	let { phase, logs = [] }: Props = $props()
	let viewport = $state<HTMLDivElement>()
	let scrollLocked = $state(true)
	let now = $state(Date.now())
	let lastScrollTop = 0

	const running = $derived(phase.status === 'running' && phase.finished_at == null)
	const waiting = $derived(
		phase.status === 'queued' ||
			phase.status === 'waiting' ||
			phase.status === 'enqueued' ||
			phase.status === 'pending'
	)
	const elapsedSeconds = $derived.by(() => {
		if (!Number.isFinite(phase.started_at)) return null
		const end = phase.finished_at ?? (running ? now : null)
		if (end === null || !Number.isFinite(end)) return null
		return Math.max(0, Math.floor((end - phase.started_at) / 1000))
	})

	$effect(() => {
		if (!running) return
		now = Date.now()
		const interval = setInterval(() => {
			now = Date.now()
		}, 1000)
		return () => clearInterval(interval)
	})

	function handleScroll() {
		if (!viewport) return
		const atBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 10
		if (atBottom) {
			scrollLocked = true
		} else if (viewport.scrollTop < lastScrollTop) {
			scrollLocked = false
		}
		lastScrollTop = viewport.scrollTop
	}

	$effect(() => {
		const rowCount = logs.length
		const node = viewport
		if (!scrollLocked || !node) return
		let canceled = false
		tick().then(() => {
			if (canceled || !scrollLocked || !node.isConnected || logs.length !== rowCount) return
			node.scrollTop = node.scrollHeight
			lastScrollTop = node.scrollTop
		})
		return () => {
			canceled = true
		}
	})
</script>

<section class="step-log">
	<header class="step-header">
		<h3>{phase.phase}</h3>
		<span class="status" class:is-error={phase.status === 'failed'}>
			{#if waiting}
				Queued
			{:else if phase.status === 'running'}
				Running
			{:else if phase.status === 'completed'}
				Completed
			{:else if phase.status === 'failed'}
				Failed
			{:else if phase.status === 'skipped'}
				Skipped
			{:else if phase.status === 'cancelled' || phase.status === 'canceled'}
				Cancelled
			{:else if phase.status === 'expired'}
				Expired
			{:else if phase.status}
				{phase.status}
			{:else}
				Unknown
			{/if}
		</span>
	</header>
	<div
		class="log-viewport"
		bind:this={viewport}
		onscroll={handleScroll}
		role="region"
		aria-label={`${phase.phase} output`}
		tabindex="0"
	>
		{#if phase.message}
			<p class="phase-message" class:is-error={phase.status === 'failed'}>{phase.message}</p>
		{/if}
		{#each logs as log (JSON.stringify([log.job_id ?? '', log.line_number]))}
			{@const timestamp = new Date(log.ts).toISOString()}
			<div class="log-row" class:is-error={log.level === 'error' || log.level === 'stderr'}>
				<time class="log-timestamp" datetime={timestamp}>
					{timestamp.slice(11, 19)}
				</time>
				<span class="log-message">{log.message}</span>
			</div>
		{:else}
			<p class="empty-message">
				{#if phase.status === 'running' || waiting}
					Waiting for output…
				{:else}
					No output recorded.
				{/if}
			</p>
		{/each}
	</div>
	<footer class="step-footer">
		<span
			>{logs.length}
			{#if logs.length === 1}line{:else}lines{/if}</span
		>
		<div class="footer-controls">
			<span aria-label="Elapsed time">
				{#if elapsedSeconds !== null}{elapsedSeconds}s{:else}—{/if}
			</span>
			<button
				type="button"
				class="scroll-lock"
				aria-label="Auto-scroll"
				aria-pressed={scrollLocked}
				title={scrollLocked ? 'Auto-scroll locked' : 'Auto-scroll unlocked'}
				onclick={() => (scrollLocked = !scrollLocked)}
			>
				{#if scrollLocked}
					<LockSimpleFill aria-hidden="true" />
				{:else}
					<LockSimpleOpenFill aria-hidden="true" />
				{/if}
			</button>
		</div>
	</footer>
</section>

<style>
	.step-log {
		min-width: 0;
		overflow: hidden;
		border: 1px solid var(--color-outline-variant);
		border-radius: var(--radius-medium);
		background: var(--color-surface-container-lowest);
		color: var(--color-on-surface);
	}

	.step-header {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		border-bottom: 1px solid var(--color-outline-variant);
		background: var(--color-surface-container);
	}

	h3 {
		flex: 1;
		min-width: 0;
		margin: 0;
		font-family: var(--font-mono-name), monospace;
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
		overflow-wrap: anywhere;
	}

	.status {
		flex-shrink: 0;
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-small);
		background: var(--color-surface-container-high);
		color: var(--color-on-surface-variant);
		font-size: var(--font-size-xxs);
	}

	.scroll-lock {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		padding: 0;
		min-width: 0;
		min-height: 0;
		border: none;
		border-radius: var(--radius-small);
		background: transparent;
		color: var(--color-on-surface-variant);
		font: inherit;
		line-height: 1;
		box-shadow: none;
		cursor: pointer;
	}

	.scroll-lock :global(svg) {
		width: 1em;
		height: 1em;
	}

	.scroll-lock:hover {
		background: var(--color-surface-container-highest);
		color: var(--color-on-surface);
	}

	.scroll-lock:focus-visible,
	.log-viewport:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: -2px;
	}

	.log-viewport {
		min-width: 0;
		max-height: 18rem;
		overflow-y: auto;
		padding: var(--space-2) var(--space-3);
		font-family: var(--font-mono-name), monospace;
		font-size: var(--font-size-xxs);
		line-height: 1.6;
	}

	.log-row {
		display: flex;
		align-items: baseline;
		gap: var(--space-3);
		min-width: 0;
	}

	.log-timestamp {
		flex-shrink: 0;
		color: var(--color-on-surface-variant);
		font-variant-numeric: tabular-nums;
	}

	.log-message {
		min-width: 0;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	.phase-message,
	.empty-message {
		margin: 0;
		color: var(--color-on-surface-variant);
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	.phase-message {
		margin-bottom: var(--space-2);
	}

	.is-error {
		color: var(--color-error);
	}

	.footer-controls {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.step-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-1) var(--space-3);
		border-top: 1px solid var(--color-outline-variant);
		background: var(--color-surface-container-low);
		color: var(--color-on-surface-variant);
		font-family: var(--font-mono-name), monospace;
		font-size: var(--font-size-xxs);
		font-variant-numeric: tabular-nums;
	}
</style>
