<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte'
	import { invalidateAll } from '$app/navigation'
	import Button from '$lib/components/ui/Button.svelte'

	import CheckCircleFill from 'virtual:icons/ph/check-circle-fill'
	import XCircleFill from 'virtual:icons/ph/x-circle-fill'
	import CircleNotchBold from 'virtual:icons/ph/circle-notch-bold'
	import MinusCircle from 'virtual:icons/ph/minus-circle'
	import SquareFill from 'virtual:icons/ph/square-fill'
	import PlayFill from 'virtual:icons/ph/play-fill'
	import MagnifyingGlass from 'virtual:icons/ph/magnifying-glass'
	import ArrowCircleUp from 'virtual:icons/ph/arrow-circle-up'
	import LockSimpleFill from 'virtual:icons/ph/lock-simple-fill'
	import LockSimpleOpenFill from 'virtual:icons/ph/lock-simple-open-fill'

	import type { PiecesDiff } from '@luzzle/core'
	import type { PageData } from './$types'
	import type { RunView } from './+page.server'

	let { data }: { data: PageData } = $props()

	type RunStatus = 'idle' | 'enqueued' | 'running' | 'completed' | 'failed'
	type ActiveKind = 'audit' | 'publish'

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

	function stateToStatus(state: string | null | undefined): RunStatus {
		switch (state) {
			case 'completed':
				return 'completed'
			case 'failed':
			case 'canceled':
				return 'failed'
			case 'running':
			case 'claimed':
				return 'running'
			case 'waiting':
				return 'enqueued'
			default:
				return 'idle'
		}
	}

	function groupLogs(rows: PhaseLog[]): Record<string, PhaseLog[]> {
		const grouped: Record<string, PhaseLog[]> = {}
		for (const log of rows) {
			if (!grouped[log.phase]) grouped[log.phase] = []
			grouped[log.phase].push(log)
		}
		return grouped
	}

	// On load, resume an in-flight run (publish takes priority over audit).
	function pickInitial(): { kind: ActiveKind; run: RunView } | null {
		const inFlight = (run: RunView | null) =>
			run && (run.state === 'running' || run.state === 'waiting')
		if (inFlight(data.publish)) return { kind: 'publish', run: data.publish as RunView }
		if (inFlight(data.audit)) return { kind: 'audit', run: data.audit as RunView }
		return null
	}
	const initial = pickInitial()

	let activeKind = $state<ActiveKind | null>(initial?.kind ?? null)
	let status = $state<RunStatus>(initial ? stateToStatus(initial.run.state) : 'idle')
	let errorMessage = $state('')
	let jobId = $state<string>(initial?.run.jobId ?? '')
	let phases = $state<PhaseProgress[]>((initial?.run.phases as PhaseProgress[]) ?? [])
	let logs = $state<Record<string, PhaseLog[]>>(groupLogs((initial?.run.logs as PhaseLog[]) ?? []))
	let scrollLocks = $state<Record<string, boolean>>({})

	let eventSource: EventSource | null = null

	let auditDiff = $derived(data.audit?.diff ?? null)
	let publishDiff = $derived(data.publish?.diff ?? null)
	let auditRunId = $derived(data.audit?.jobId ?? '')
	let auditReady = $derived(data.audit?.state === 'completed')
	let publishedAfterAudit = $derived(
		data.publish?.state === 'completed' && activeKind === 'publish' && status === 'completed'
	)
	let busy = $derived(status === 'running' || status === 'enqueued')
	let canPublish = $derived(auditReady && !busy)

	function hasChanges(diff: PiecesDiff): boolean {
		return [
			diff.schemas.added,
			diff.schemas.updated,
			diff.schemas.pruned,
			diff.pieces.added,
			diff.pieces.updated,
			diff.pieces.pruned
		].some((list) => list.length > 0)
	}

	function formatDuration(ms: number) {
		if (ms < 0) return '0s'
		const s = Math.floor(ms / 1000)
		if (s < 60) return `${s}s`
		const m = Math.floor(s / 60)
		return `${m}m ${s % 60}s`
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

	function resetLive() {
		errorMessage = ''
		jobId = ''
		phases = []
		logs = {}
		status = 'idle'
	}

	function startWatching(id: string) {
		if (eventSource) eventSource.close()

		eventSource = new EventSource(`/api/admin/publish/${id}/stream`)

		eventSource.addEventListener('state', (e) => {
			const payload = JSON.parse(e.data)
			if (payload.state === 'running' || payload.state === 'claimed') status = 'running'
			else if (payload.state === 'waiting') status = 'enqueued'
		})

		eventSource.addEventListener('phase', (e) => {
			phases = JSON.parse(e.data)
		})

		eventSource.addEventListener('log', (e) => {
			const newLogs: PhaseLog[] = JSON.parse(e.data)
			const touched = new Set<string>()
			for (const log of newLogs) {
				if (!logs[log.phase]) logs[log.phase] = []
				logs[log.phase].push(log)
				touched.add(log.phase)
			}
			tick().then(() => {
				for (const phase of touched) {
					if (scrollLocks[phase] ?? true) {
						const el = document.getElementById(`log-container-${phase}`)
						if (el) el.scrollTop = el.scrollHeight
					}
				}
			})
		})

		eventSource.addEventListener('done', (e) => {
			const payload = JSON.parse(e.data)
			status = payload.state === 'completed' ? 'completed' : 'failed'
			if (payload.errors && payload.errors.length > 0) {
				errorMessage = payload.errors[0]?.message || 'Unknown error'
			}
			eventSource?.close()
			eventSource = null
			// Refresh loader data so the latest audit/publish diff renders.
			invalidateAll()
		})

		eventSource.addEventListener('error', (e) => {
			const msgEvent = e as MessageEvent
			if (msgEvent.data) {
				try {
					errorMessage = JSON.parse(msgEvent.data).message || 'Stream error'
				} catch {
					errorMessage = 'Stream error'
				}
			}
		})
	}

	async function trigger(url: string, body: Record<string, unknown>, kind: ActiveKind) {
		activeKind = kind
		resetLive()
		try {
			const response = await fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			})
			const payload = await response.json().catch(() => null)

			if (!response.ok) {
				if (response.status === 409 && payload?.jobId) {
					jobId = payload.jobId
					status = 'enqueued'
					startWatching(jobId)
					return
				}
				status = 'failed'
				errorMessage = payload?.message || `Server error: ${response.status}`
				return
			}

			jobId = payload.jobId
			status = 'enqueued'
			startWatching(jobId)
		} catch (e) {
			status = 'failed'
			errorMessage = e instanceof Error ? e.message : String(e)
		}
	}

	function checkChanges() {
		trigger('/api/admin/publish/audit', { bisync: false }, 'audit')
	}

	function syncAndCheck() {
		trigger('/api/admin/publish/audit', { bisync: true }, 'audit')
	}

	function startPublish() {
		if (!auditRunId) return
		trigger('/api/admin/publish', { auditRunId }, 'publish')
	}

	function cancel() {
		if (eventSource) {
			eventSource.close()
			eventSource = null
		}
		status = 'idle'
	}

	onMount(() => {
		if (initial) startWatching(initial.run.jobId)
	})

	onDestroy(() => {
		if (eventSource) eventSource.close()
	})

	let overallDuration = $derived.by(() => {
		if (phases.length === 0) return 0
		const first = phases[0]
		if (!first.started_at) return 0
		const last = phases[phases.length - 1]
		const end = last.finished_at || Date.now()
		return end - first.started_at
	})
	let completedStages = $derived(phases.filter((p) => p.status === 'completed').length)
	let totalStages = $derived(phases.length)
	let activeLabel = $derived(activeKind === 'publish' ? 'Publishing' : 'Checking for changes')
</script>

<section class="publish-view">
	<header class="publish-header">
		<h1>Publish</h1>
	</header>

	<div class="controls">
		<p class="controls-hint">
			Check what would change, then publish. <strong>Sync &amp; check</strong> pulls the latest from
			the remote first.
		</p>
		<div class="controls-actions">
			{#if busy}
				<Button variant="outline" onclick={cancel}>
					<SquareFill class="btn-icon" /> Stop watching
				</Button>
			{:else}
				<Button variant="outline" onclick={checkChanges}>
					<MagnifyingGlass class="btn-icon" /> Check pending changes
				</Button>
				<Button variant="outline" onclick={syncAndCheck}>
					<ArrowCircleUp class="btn-icon" /> Sync &amp; check
				</Button>
				<Button onclick={startPublish} disabled={!canPublish}>
					<PlayFill class="btn-icon" /> Publish
				</Button>
			{/if}
		</div>
	</div>

	{#if errorMessage && status === 'failed'}
		<div class="error-strip">
			<XCircleFill class="error-icon" />
			<span>{errorMessage}</span>
		</div>
	{/if}

	{#if auditReady && auditDiff}
		<div class="report">
			<h2 class="report-title">
				{publishedAfterAudit ? 'Published' : 'Pending changes'}
			</h2>
			{@render changeList(auditDiff)}
		</div>
	{:else if publishedAfterAudit && publishDiff}
		<div class="report">
			<h2 class="report-title">Published</h2>
			{@render changeList(publishDiff)}
		</div>
	{/if}

	{#if status !== 'idle' || phases.length > 0}
		<div class="status-card">
			<div class="status-left">
				<span class="status-icon-wrap status-{status}">
					{#if status === 'completed'}
						<CheckCircleFill class="status-icon" />
					{:else if status === 'running'}
						<CircleNotchBold class="status-icon spin" />
					{:else if status === 'enqueued'}
						<CircleNotchBold class="status-icon" />
					{:else if status === 'failed'}
						<XCircleFill class="status-icon" />
					{:else}
						<span class="status-dot"></span>
					{/if}
				</span>

				<div class="status-text">
					{#if status === 'enqueued'}
						<div class="status-title">Enqueued</div>
						<div class="status-sub">Waiting for worker…</div>
					{:else if status === 'running'}
						<div class="status-title">{activeLabel}</div>
						<div class="status-sub">
							<span class="highlight">{completedStages}/{totalStages}</span> stages ·
							<span class="highlight">{formatDuration(overallDuration)}</span> elapsed
						</div>
					{:else if status === 'completed'}
						<div class="status-title">{activeLabel} complete</div>
						<div class="status-sub">
							{totalStages} stages · {formatDuration(overallDuration)} total
						</div>
					{:else if status === 'failed'}
						<div class="status-title">{activeLabel} failed</div>
						<div class="status-sub">
							{completedStages}/{totalStages} stages · {formatDuration(overallDuration)}
						</div>
					{/if}
				</div>
			</div>
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

						{#if phase.status === 'skipped'}
							<span class="phase-aside phase-time">—</span>
						{/if}
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
											const next = !(scrollLocks[phase.phase] ?? true)
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
</section>

{#snippet changeList(diff: PiecesDiff)}
	{#if hasChanges(diff)}
		<div class="change-groups">
			{@render changeGroup('added', 'Added', diff.schemas.added, diff.pieces.added)}
			{@render changeGroup('updated', 'Updated', diff.schemas.updated, diff.pieces.updated)}
			{@render changeGroup('pruned', 'Pruned', diff.schemas.pruned, diff.pieces.pruned)}
		</div>
	{:else}
		<div class="up-to-date">
			<CheckCircleFill class="up-to-date-icon" /> Up to date — nothing to publish.
		</div>
	{/if}
{/snippet}

{#snippet changeGroup(kind: string, label: string, schemas: string[], pieces: string[])}
	{#if schemas.length > 0 || pieces.length > 0}
		<div class="change-group change-{kind}">
			<span class="change-label">{label}</span>
			<ul class="change-list">
				{#each schemas as name (name)}
					<li class="change-schema">piece type: {name}</li>
				{/each}
				{#each pieces as file (file)}
					<li><a href="/admin/piece/{file}/source">{file}</a></li>
				{/each}
			</ul>
		</div>
	{/if}
{/snippet}

<style>
	.publish-view {
		padding: var(--space-8) var(--space-4);
		max-width: 860px;
		margin: 0 auto;
		color: var(--color-on-surface);
		font-size: var(--font-size-xs);
		line-height: 1.4;
	}

	.publish-header {
		margin-bottom: var(--space-5);
	}

	.publish-header h1 {
		margin: 0;
		font-size: var(--font-size-normal);
		font-weight: var(--font-weight-bold);
		letter-spacing: -0.01em;
	}

	.controls {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-4);
		flex-wrap: wrap;
		padding: var(--space-4) var(--space-3);
		background-color: var(--color-surface-container-lowest);
		border: 1px solid var(--color-outline-variant);
		border-radius: var(--radius-medium);
		margin-bottom: var(--space-5);
	}

	.controls-hint {
		margin: 0;
		max-width: 38ch;
		font-size: var(--font-size-xxs);
		color: var(--color-on-surface-variant);
	}

	.controls-actions {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		flex-wrap: wrap;
	}

	.controls-actions :global(.btn-icon) {
		font-size: 14px;
	}

	.report {
		padding: var(--space-4) var(--space-3);
		background-color: var(--color-surface-container-lowest);
		border: 1px solid var(--color-outline-variant);
		border-radius: var(--radius-medium);
		margin-bottom: var(--space-5);
	}

	.report-title {
		margin: 0 0 var(--space-3) 0;
		font-size: var(--font-size-small);
		font-weight: var(--font-weight-semibold);
	}

	.change-groups {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.change-group {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.change-label {
		font-size: var(--font-size-xxs);
		font-weight: var(--font-weight-semibold);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.change-added .change-label {
		color: var(--color-primary);
	}
	.change-updated .change-label {
		color: var(--color-secondary);
	}
	.change-pruned .change-label {
		color: var(--color-error);
	}

	.change-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.change-list li {
		font-family: var(--font-mono);
		font-size: var(--font-size-xxs);
		color: var(--color-on-surface-variant);
	}

	.change-list a {
		color: var(--color-on-surface);
		text-decoration: none;
	}

	.change-list a:hover {
		text-decoration: underline;
	}

	.change-schema {
		font-style: italic;
	}

	.up-to-date {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		color: var(--color-primary);
		font-size: var(--font-size-small);
	}

	.up-to-date :global(.up-to-date-icon) {
		font-size: 16px;
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

	.status-card {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-4) var(--space-3);
		background-color: var(--color-surface-container-lowest);
		border: 1px solid var(--color-outline-variant);
		border-radius: var(--radius-medium);
		margin-bottom: var(--space-5);
	}

	.status-left {
		display: flex;
		align-items: center;
		gap: var(--space-5);
		min-width: 0;
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
	.status-icon-wrap.status-completed {
		color: var(--color-primary);
	}
	.status-icon-wrap.status-failed {
		color: var(--color-error);
	}

	.status-text {
		min-width: 0;
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

	.status-sub .highlight {
		color: var(--color-on-surface);
		font-weight: var(--font-weight-medium);
	}

	.timeline {
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
