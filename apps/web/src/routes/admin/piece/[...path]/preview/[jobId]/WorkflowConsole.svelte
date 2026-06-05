<script lang="ts">
	import { tick } from 'svelte'
	import CheckCircleFill from 'virtual:icons/ph/check-circle-fill'
	import XCircleFill from 'virtual:icons/ph/x-circle-fill'
	import CircleNotchBold from 'virtual:icons/ph/circle-notch-bold'
	import MinusCircle from 'virtual:icons/ph/minus-circle'
	import LockSimpleFill from 'virtual:icons/ph/lock-simple-fill'
	import LockSimpleOpenFill from 'virtual:icons/ph/lock-simple-open-fill'

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

	interface Props {
		status: string
		errorMessage?: string
		phases: PhaseProgress[]
		logs: Record<string, PhaseLog[]>
	}

	let { status, errorMessage = '', phases, logs }: Props = $props()

	let scrollLocks = $state<Record<string, boolean>>({})

	function formatDuration(ms: number) {
		if (ms < 0) return '0s'
		const s = Math.floor(ms / 1000)
		if (s < 60) return `${s}s`
		const m = Math.floor(s / 60)
		const remS = s % 60
		return `${m}m ${remS}s`
	}

	function handleScroll(phaseName: string, event: Event) {
		const el = event.currentTarget as HTMLDivElement
		if (!el) return
		const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 10
		const currentLock = scrollLocks[phaseName] ?? true

		if (isAtBottom && !currentLock) {
			scrollLocks[phaseName] = true
		} else if (!isAtBottom && currentLock) {
			scrollLocks[phaseName] = false
		}
	}

	let overallDuration = $derived.by(() => {
		if (phases.length === 0) return 0
		const first = phases[0]
		const last = phases[phases.length - 1]
		if (!first.started_at) return 0
		const end = last.finished_at || Date.now()
		return end - first.started_at
	})

	let logLengths = $derived(
		Object.fromEntries(Object.entries(logs).map(([phase, list]) => [phase, list.length]))
	)

	$effect(() => {
		for (const [phase, _length] of Object.entries(logLengths)) {
			const isLocked = scrollLocks[phase] ?? true
			if (isLocked) {
				tick().then(() => {
					const el = document.getElementById(`log-container-${phase}`)
					if (el) el.scrollTop = el.scrollHeight
				})
			}
		}
	})
</script>

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
		{:else if status === 'completed'}
			<div class="status-title">Preview completed</div>
			<div class="status-sub">{formatDuration(overallDuration)} total time</div>
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
			{@const hasLogs = (logs[phase.phase]?.length ?? 0) > 0}
			<div class="phase">
				<div class="phase-row">
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

				{#if hasLogs}
					<div class="log-console">
						<div class="log-header">
							<span>{logs[phase.phase]?.length || 0} lines</span>
							<div class="log-header-right">
								{#if phase.started_at}
									<span class="log-duration">
										{formatDuration((phase.finished_at || Date.now()) - phase.started_at)}
									</span>
								{/if}
								<button
									type="button"
									class="scroll-lock-btn"
									onclick={() => {
										const current = scrollLocks[phase.phase] ?? true
										const next = !current
										scrollLocks[phase.phase] = next
										if (next) {
											tick().then(() => {
												const el = document.getElementById(`log-container-${phase.phase}`)
												if (el) el.scrollTop = el.scrollHeight
											})
										}
									}}
									title={(scrollLocks[phase.phase] ?? true)
										? 'Auto-scroll locked'
										: 'Auto-scroll unlocked'}
								>
									{#if scrollLocks[phase.phase] ?? true}
										<LockSimpleFill class="lock-icon" />
									{:else}
										<LockSimpleOpenFill class="lock-icon" />
									{/if}
								</button>
							</div>
						</div>
						<div
							class="log-viewport"
							id="log-container-{phase.phase}"
							onscroll={(e) => handleScroll(phase.phase, e)}
						>
							{#each logs[phase.phase] ?? [] as log (log.line_number)}
								<div
									class="log-row"
									class:is-error={log.level === 'error' || log.level === 'stderr'}
								>
									<span class="log-timestamp">
										{new Date(log.ts).toISOString().split('T')[1].slice(0, -5)}
									</span>
									<span class="log-body">{log.message}</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/each}
	</div>
{/if}

<style>
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
		font-size: var(--font-size-small);
		font-weight: var(--font-weight-semibold);
		color: var(--color-on-surface);
	}

	.status-sub {
		margin-top: 2px;
		font-size: var(--font-size-xxs);
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
		font-size: var(--font-size-xxs);
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
		gap: var(--space-4);
	}

	.phase {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.phase-row {
		padding: var(--space-2) 0;
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
		font-size: var(--font-size-small);
		font-weight: var(--font-weight-medium);
		color: var(--color-on-surface);
		flex-shrink: 0;
	}

	.phase-message {
		font-size: var(--font-size-xxs);
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
		font-size: var(--font-size-xxs);
		color: var(--color-on-surface-variant);
		min-width: 36px;
		text-align: right;
	}

	.log-console {
		margin: 4px 0 0 0;
		background-color: var(--color-surface);
		border: 1px solid var(--color-outline-variant);
		border-radius: var(--radius-small);
		overflow: hidden;
	}

	.log-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-3);
		padding: 4px var(--space-3);
		background-color: var(--color-surface-container-low);
		border-bottom: 1px solid var(--color-outline-variant);
		font-family: var(--font-mono);
		font-size: var(--font-size-xxs);
		font-weight: var(--font-weight-semibold);
		color: var(--color-on-surface-variant);
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.log-duration {
		color: var(--color-on-surface);
	}

	.log-header-right {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.scroll-lock-btn {
		background: none;
		border: none;
		padding: 2px;
		margin: 0;
		color: var(--color-on-surface-variant);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-small);
		transition:
			background-color 0.15s,
			color 0.15s;
	}

	.scroll-lock-btn:hover {
		background-color: var(--color-surface-container-highest);
		color: var(--color-on-surface);
	}

	.scroll-lock-btn :global(.lock-icon) {
		font-size: 14px;
	}

	.log-viewport {
		padding: var(--space-2) var(--space-3);
		max-height: 260px;
		overflow-y: auto;
		font-family: var(--font-mono);
		font-size: var(--font-size-xxs);
		line-height: 1.6;
		color: var(--color-on-surface-variant);
	}

	.log-row {
		display: flex;
		gap: var(--space-3);
	}

	.log-row.is-error {
		background-color: color-mix(in srgb, var(--color-error) 10%, transparent);
		color: var(--color-error);
		margin: 0 calc(-1 * var(--space-3));
		padding: 0 var(--space-3);
	}

	.log-timestamp {
		color: var(--color-outline);
		flex-shrink: 0;
		opacity: 0.7;
	}

	.log-body {
		white-space: pre-wrap;
		word-break: break-all;
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
