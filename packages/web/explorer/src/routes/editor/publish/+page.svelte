<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte'
	import { onDestroy } from 'svelte'

	let isRunning = $state(false)
	let status = $state<'idle' | 'enqueued' | 'running' | 'completed' | 'failed'>('idle')
	let errorMessage = $state('')
	let jobId = $state<string | number>('')

	type PhaseProgress = {
		phase: string
		status: string
		started_at: number
		finished_at: number | null
		message: string | null
	}
	type PhaseLog = {
		job_id: number
		phase: string
		line_number: number
		ts: number
		level: string
		message: string
	}

	let phases = $state<PhaseProgress[]>([])
	let logs = $state<Record<string, PhaseLog[]>>({})
	let expandedPhases = $state<Record<string, boolean>>({})

	let eventSource: EventSource | null = null

	function formatDuration(ms: number) {
		const s = Math.floor(ms / 1000)
		const m = Math.floor(s / 60)
		const remS = s % 60
		return m > 0 ? `${m}m ${remS}s` : `${remS}s`
	}

	function startWatching(id: string | number) {
		if (eventSource) eventSource.close()

		eventSource = new EventSource(`/api/publish/${id}/stream`)

		eventSource.addEventListener('state', (e) => {
			const data = JSON.parse(e.data)
			if (data.state === 'running' || data.state === 'claimed') {
				status = 'running'
			} else if (data.state === 'waiting') {
				status = 'enqueued'
			}
		})

		eventSource.addEventListener('phase', (e) => {
			phases = JSON.parse(e.data)
		})

		eventSource.addEventListener('log', (e) => {
			const newLogs: PhaseLog[] = JSON.parse(e.data)
			for (const log of newLogs) {
				if (!logs[log.phase]) {
					logs[log.phase] = []
				}
				logs[log.phase].push(log)
			}

			// Simple auto-scroll check for expanded phases
			for (const p in expandedPhases) {
				if (expandedPhases[p]) {
					const el = document.getElementById(`log-container-${p}`)
					if (el) {
						// Only scroll if already near bottom or just newly expanded
						setTimeout(() => {
							el.scrollTop = el.scrollHeight
						}, 0)
					}
				}
			}
		})

		eventSource.addEventListener('done', (e) => {
			const data = JSON.parse(e.data)
			status = data.state === 'completed' ? 'completed' : 'failed'
			if (data.errors && data.errors.length > 0) {
				errorMessage = data.errors[0]?.message || 'Unknown error'
			}
			eventSource?.close()
			eventSource = null
			isRunning = false
		})

		eventSource.addEventListener('error', (e) => {
			const msgEvent = e as MessageEvent
			// msgEvent.data might be undefined for native EventSource errors
			if (msgEvent.data) {
				try {
					const data = JSON.parse(msgEvent.data)
					errorMessage = data.message || 'Stream error'
				} catch {
					errorMessage = 'Stream error'
				}
			} else if (status !== 'completed' && status !== 'failed') {
				// Don't override status if we were just disconnected normally
				// Reconnection is handled automatically by the browser
			}
		})

		eventSource.addEventListener('cursor', (_e) => {
			// Heartbeat/cursor update
		})
	}

	async function startPublish() {
		isRunning = true
		status = 'idle'
		errorMessage = ''
		jobId = ''
		phases = []
		logs = {}
		expandedPhases = {}

		try {
			const response = await fetch(`/api/publish`, {
				method: 'POST'
			})

			const data = await response.json().catch(() => null)

			if (!response.ok) {
				if (response.status === 409 && data?.jobId) {
					jobId = data.jobId
					status = 'enqueued'
					startWatching(jobId)
					return
				}
				status = 'failed'
				errorMessage =
					response.status === 409 && !data?.jobId
						? `Conflict: Job already running`
						: `Server error: ${response.status}`
				isRunning = false
				return
			}

			jobId = data.jobId
			status = 'enqueued'
			startWatching(jobId)
		} catch (e) {
			status = 'failed'
			errorMessage = e instanceof Error ? e.message : String(e)
			isRunning = false
		}
	}

	onDestroy(() => {
		if (eventSource) {
			eventSource.close()
		}
	})

	function togglePhase(phaseName: string) {
		expandedPhases[phaseName] = !expandedPhases[phaseName]
	}

	function getStatusIcon(s: string) {
		switch (s) {
			case 'completed':
				return '✓'
			case 'skipped':
				return '⏭'
			case 'failed':
				return '✗'
			case 'running':
				return '⏳'
			default:
				return '·'
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
</script>

<section class="builder-container">
	<header>
		<h1>Publish Workspace</h1>
		<div class="actions">
			<Button onclick={startPublish} disabled={isRunning}>
				{isRunning ? (status === 'enqueued' ? 'Waiting...' : 'Publishing...') : 'Publish Changes'}
			</Button>
		</div>
	</header>

	{#if errorMessage}
		<div class="error-box">
			<strong>Error:</strong>
			{errorMessage}
		</div>
	{/if}

	{#if status !== 'idle' && status !== 'failed'}
		<div class="progress-container">
			<div class="progress-header">
				<h2>Status: <span class="status-badge status-{status}">{status}</span></h2>
				{#if phases.length > 0}
					<div class="duration">{formatDuration(overallDuration)}</div>
				{/if}
			</div>

			<div class="phases-list">
				{#each phases as phase (phase.phase)}
					<div class="phase-item">
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div class="phase-header" onclick={() => togglePhase(phase.phase)}>
							<span class="phase-icon status-{phase.status}">{getStatusIcon(phase.status)}</span>
							<span class="phase-name">{phase.phase}</span>
							{#if phase.finished_at}
								<span class="phase-duration"
									>({formatDuration(phase.finished_at - phase.started_at)})</span
								>
							{/if}
							{#if phase.message}
								<span class="phase-msg">— {phase.message}</span>
							{/if}
							<span class="phase-toggle">
								{expandedPhases[phase.phase] ? '▼' : '▶'}
							</span>
						</div>
						{#if expandedPhases[phase.phase]}
							<div class="phase-logs" id="log-container-{phase.phase}">
								{#if logs[phase.phase] && logs[phase.phase].length > 0}
									{#each logs[phase.phase] as log (log.line_number)}
										<div class="log-line level-{log.level}">
											<span class="log-ts"
												>{new Date(log.ts).toISOString().split('T')[1].slice(0, -1)}</span
											>
											<span class="log-msg">{log.message}</span>
										</div>
									{/each}
								{:else}
									<div class="log-line empty">No logs yet...</div>
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}
</section>

<style>
	.builder-container {
		margin: var(--space-4) auto;
		padding: 0 var(--space-4);
		width: 85%;
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		max-width: clamp(500px, 80%, 1200px);
	}

	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: var(--space-4);
	}

	.actions {
		display: flex;
		gap: var(--space-3);
	}

	h1 {
		font-size: var(--font-size-xl);
		margin: 0;
	}

	.error-box {
		padding: var(--space-3);
		background-color: var(--color-error-container);
		color: var(--color-on-error-container);
		border-radius: var(--radius-small);
		border: 1px solid var(--color-error);
	}

	.progress-container {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-medium);
		padding: var(--space-4);
		background-color: var(--color-surface);
	}

	.progress-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 1px solid var(--color-border);
		padding-bottom: var(--space-2);
	}

	.progress-header h2 {
		margin: 0;
		font-size: var(--font-size-lg);
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.status-badge {
		font-size: var(--font-size-sm);
		padding: 2px 8px;
		border-radius: 12px;
		text-transform: uppercase;
		font-weight: 600;
	}

	.status-badge.status-completed {
		background-color: var(--color-primary-container);
		color: var(--color-on-primary-container);
	}
	.status-badge.status-running {
		background-color: var(--color-secondary-container);
		color: var(--color-on-secondary-container);
	}
	.status-badge.status-enqueued {
		background-color: var(--color-surface-variant);
		color: var(--color-on-surface-variant);
	}
	.status-badge.status-failed {
		background-color: var(--color-error-container);
		color: var(--color-on-error-container);
	}

	.duration {
		font-family: var(--font-mono);
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
	}

	.phases-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.phase-item {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-small);
		overflow: hidden;
	}

	.phase-header {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		background-color: var(--color-surface-variant);
		cursor: pointer;
		user-select: none;
	}

	.phase-header:hover {
		background-color: var(--color-surface-hover);
	}

	.phase-icon {
		font-weight: bold;
		width: 1.5rem;
		text-align: center;
	}
	.phase-icon.status-completed {
		color: var(--color-primary);
	}
	.phase-icon.status-failed {
		color: var(--color-error);
	}
	.phase-icon.status-running {
		color: var(--color-secondary);
		animation: pulse 1.5s infinite;
	}
	.phase-icon.status-skipped {
		color: var(--color-text-muted);
	}

	.phase-name {
		font-weight: 600;
	}

	.phase-duration {
		font-family: var(--font-mono);
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
	}

	.phase-msg {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		flex-grow: 1;
	}

	.phase-toggle {
		margin-left: auto;
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
	}

	.phase-logs {
		background-color: #1e1e1e;
		color: #d4d4d4;
		font-family: var(--font-mono);
		font-size: var(--font-size-sm);
		padding: var(--space-2);
		max-height: 400px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
	}

	.log-line {
		display: flex;
		gap: var(--space-2);
		line-height: 1.4;
		white-space: pre-wrap;
		word-break: break-all;
	}

	.log-ts {
		color: #858585;
		flex-shrink: 0;
	}

	.log-line.level-error .log-msg {
		color: #f48771;
	}
	.log-line.level-warn .log-msg {
		color: #cca700;
	}
	.log-line.level-stderr .log-msg {
		color: #e06c75;
	}

	.log-line.empty {
		color: #858585;
		font-style: italic;
	}

	@keyframes pulse {
		0% {
			opacity: 1;
		}
		50% {
			opacity: 0.4;
		}
		100% {
			opacity: 1;
		}
	}
</style>
