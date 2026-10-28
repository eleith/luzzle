<script lang="ts">
	import { onMount, onDestroy, tick, untrack } from 'svelte'
	import { invalidateAll } from '$app/navigation'
	import { page } from '$app/state'
	import Button from '$lib/components/ui/Button.svelte'
	import PublishTable from './PublishTable.svelte'
	import PublishDetails from './PublishDetails.svelte'

	import ArrowClockwise from 'virtual:icons/ph/arrow-clockwise'
	import ArrowsClockwise from 'virtual:icons/ph/arrows-clockwise'
	import CheckCircleFill from 'virtual:icons/ph/check-circle-fill'
	import XCircleFill from 'virtual:icons/ph/x-circle-fill'
	import CircleNotchBold from 'virtual:icons/ph/circle-notch-bold'

	import type { PiecesDiff } from '@luzzle/core'
	import type { PublishPieceFailure } from '@luzzle/web.jobs'
	import type { PageData } from './$types'
	import type { RunView } from './+page.server'
	import {
		getRunKind,
		latestPhases,
		selectablePaths,
		initialSelection,
		canPublishSelection,
		recordPublication,
		completionReport,
		pendingAfterPublication,
		retainSelection,
		mergePhaseLogs,
		type PhaseLog,
		type PhaseProgress,
		type PublicationOutcome,
		type ActiveKind
	} from './report.js'

	let { data }: { data: PageData } = $props()

	type RunStatus = 'idle' | 'submitting' | 'enqueued' | 'running' | 'completed' | 'failed'
	type RunCompletion = {
		id: string
		completed: boolean
		refreshed: boolean
		failures: PublishPieceFailure[]
		error: string
	}
	type CheckOptions = {
		syncRemote: boolean
		afterPublication?: boolean
	}
	type DisplayFailure = {
		reason:
			| 'pending-refresh'
			| 'checked-changes'
			| 'publication-refresh'
			| 'conflict'
			| 'server'
			| 'stream'
			| 'detail'
		details?: string
		status?: number
		afterPublication?: boolean
	}

	function stateToStatus(state: string): RunStatus {
		if (state === 'completed') return 'completed'
		if (state === 'failed' || state === 'canceled') return 'failed'
		if (state === 'running' || state === 'claimed') return 'running'
		if (state === 'waiting') return 'enqueued'
		return 'idle'
	}

	function pickInitial(): { kind: ActiveKind; run: RunView } | null {
		const inFlight = (run: RunView | null) =>
			run && (run.state === 'running' || run.state === 'waiting')
		if (inFlight(data.publish)) return { kind: 'publish', run: data.publish as RunView }
		if (inFlight(data.audit)) return { kind: 'audit', run: data.audit as RunView }
		if (data.publish?.state === 'completed' && data.publish.failedPieces.length > 0) {
			return { kind: 'publish', run: data.publish }
		}
		return null
	}

	const initial = pickInitial()
	const resumingCheck = initial?.kind === 'audit'
	const initialPublication = untrack(() => {
		if (data.publish?.state !== 'completed') return null
		if (resumingCheck) return data.publish
		if (initial?.kind === 'publish') return data.publish
		return null
	})
	const initialDetails = initialPublication ?? initial?.run

	let activeKind = $state<ActiveKind | null>(initial?.kind ?? null)
	let status = $state<RunStatus>(initial ? stateToStatus(initial.run.state) : 'idle')
	let displayFailure = $state<DisplayFailure | null>(null)
	let streamDisconnected = $state(false)
	let jobId = $state(initial?.run.jobId ?? '')
	let phases = $state<PhaseProgress[]>((initialDetails?.phases as PhaseProgress[]) ?? [])
	let logs = $state<Record<string, PhaseLog[]>>(
		mergePhaseLogs({}, (initialDetails?.logs as PhaseLog[]) ?? [])
	)
	let pendingDiff = $state<PiecesDiff | null>(null)
	let outcomes = $state<PublicationOutcome[]>(
		initialPublication
			? recordPublication(initialPublication.diff, initialPublication.failedPieces)
			: []
	)
	let selectedPaths = $state<string[]>(
		initialPublication?.failedPieces.map((failure) => failure.filePath) ?? []
	)
	let fileOrder = $state<string[]>(
		initialPublication?.diff ? selectablePaths(initialPublication.diff) : []
	)
	let publishingPaths = $state<string[]>([])
	let auditRunId = $state('')
	let checkingAfterPublication = $state(resumingCheck && initialPublication !== null)
	let publicationState = $state<'none' | 'complete' | 'failed'>(
		initialPublication ? 'complete' : 'none'
	)
	let publicationError = $state('')
	let detailsDiff = $state<PiecesDiff | null>(initialDetails?.diff ?? null)
	const requestedFile = $derived(page.url.searchParams.get('file'))
	let eventSource: EventSource | null = null
	let disposed = false

	let busy = $derived(status === 'submitting' || status === 'running' || status === 'enqueued')
	let availablePaths = $derived(pendingDiff ? selectablePaths(pendingDiff) : [])
	let missingPreselection = $derived(
		pendingDiff !== null && requestedFile !== null && !availablePaths.includes(requestedFile)
	)
	let canPublish = $derived(
		!busy &&
			auditRunId !== '' &&
			pendingDiff !== null &&
			canPublishSelection(pendingDiff, selectedPaths)
	)
	let currentDiff = $derived(auditRunId ? pendingDiff : detailsDiff)
	let hasTableRows = $derived(
		availablePaths.length > 0 || (pendingDiff?.pieces.pruned.length ?? 0) > 0 || outcomes.length > 0
	)

	function hasChanges(diff: PiecesDiff): boolean {
		return [...Object.values(diff.schemas), ...Object.values(diff.pieces)].some(
			(list) => list.length > 0
		)
	}

	function resetLive(afterPublication: boolean) {
		displayFailure = null
		streamDisconnected = false
		jobId = ''
		if (!afterPublication) {
			phases = []
			logs = {}
			detailsDiff = null
		}
		status = 'idle'
	}

	function finishCheck(
		{ id, completed, refreshed, error }: RunCompletion,
		afterPublication: boolean
	) {
		const audit = data.audit?.jobId === id ? data.audit : null
		checkingAfterPublication = false
		if (!completed || !refreshed || !audit?.diff) {
			status = 'failed'
			if (afterPublication) {
				displayFailure = { reason: 'pending-refresh' }
			} else if (error) {
				displayFailure = { reason: 'detail', details: error }
			} else {
				displayFailure = { reason: 'checked-changes' }
			}
			return
		}
		pendingDiff = audit.diff
		if (afterPublication) {
			selectedPaths = retainSelection(audit.diff, selectedPaths)
			fileOrder = [...new Set([...fileOrder, ...selectablePaths(audit.diff)])]
		} else {
			selectedPaths = initialSelection(audit.diff, requestedFile)
			fileOrder = selectablePaths(audit.diff)
			outcomes = []
			publicationState = 'none'
			publicationError = ''
			detailsDiff = audit.diff
		}
		displayFailure = null
		auditRunId = id
	}

	function finishPublication(completion: RunCompletion) {
		const { completed, refreshed, error } = completion
		let diff: PiecesDiff | null = null
		publishingPaths = []
		if (completed) {
			const report = completionReport(completion, data.publish)
			diff = report.diff
			const failedPieces = report.failedPieces
			outcomes = recordPublication(diff, failedPieces, outcomes)
			pendingDiff = pendingAfterPublication(pendingDiff, diff, failedPieces)
			selectedPaths = [...new Set(failedPieces.map((failure) => failure.filePath))]
			publicationState = 'complete'
			publicationError = ''
		} else {
			publicationState = 'failed'
			publicationError = error
		}
		detailsDiff = diff
		if (!refreshed || (completed && !diff)) {
			displayFailure = { reason: 'publication-refresh' }
			return
		}
		getChanges({ syncRemote: false, afterPublication: true })
	}

	function startWatching(id: string) {
		eventSource?.close()
		streamDisconnected = false
		eventSource = new EventSource(`/api/admin/publish/${id}/stream`)

		eventSource.addEventListener('state', (e) => {
			const payload = JSON.parse(e.data)
			activeKind = getRunKind(payload.workflowName, activeKind)
			if (payload.state === 'running' || payload.state === 'claimed') status = 'running'
			else if (payload.state === 'waiting') status = 'enqueued'
		})
		eventSource.addEventListener('phase', (e) => {
			if (checkingAfterPublication) return
			phases = JSON.parse(e.data)
		})
		eventSource.addEventListener('log', (e) => {
			if (checkingAfterPublication) return
			const newLogs: PhaseLog[] = JSON.parse(e.data)
			logs = mergePhaseLogs(logs, newLogs)
		})
		eventSource.addEventListener('done', async (e) => {
			const payload = JSON.parse(e.data)
			const finishedId = jobId
			const afterPublication = checkingAfterPublication
			activeKind = getRunKind(payload.workflowName, activeKind)
			const completed = payload.state === 'completed'
			const failures = Array.isArray(payload.failedPieces) ? payload.failedPieces : []
			const error = payload.errors?.[0]?.message || ''
			eventSource?.close()
			eventSource = null
			let refreshed = true
			try {
				await invalidateAll()
				await tick()
			} catch (error) {
				refreshed = false
				console.error('Failed to refresh publish results:', error)
			}
			if (disposed) return
			status = completed ? 'completed' : 'failed'
			const completion = { id: finishedId, completed, refreshed, failures, error }
			if (activeKind === 'publish') {
				finishPublication(completion)
			} else {
				finishCheck(completion, afterPublication)
			}
		})
		eventSource.addEventListener('error', (e) => {
			if (eventSource?.readyState === EventSource.CLOSED) streamDisconnected = true
			const message = e as MessageEvent
			if (message.data) {
				let details = ''
				try {
					const payload = JSON.parse(message.data)
					if (typeof payload?.message === 'string') details = payload.message
				} catch {
					// A malformed stream error has no diagnostic detail.
				}
				displayFailure = { reason: 'stream', details }
			}
		})
	}

	async function trigger(
		url: string,
		body: Record<string, unknown>,
		kind: ActiveKind,
		afterPublication = false
	) {
		activeKind = kind
		resetLive(afterPublication)
		status = 'submitting'
		try {
			const response = await fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			})
			const payload = await response.json().catch(() => null)
			if (disposed) return
			if (!response.ok) {
				status = 'failed'
				checkingAfterPublication = false
				publishingPaths = []
				if (response.status === 409) {
					displayFailure = { reason: 'conflict', afterPublication }
				} else if (typeof payload?.message === 'string' && payload.message) {
					displayFailure = { reason: 'detail', details: payload.message, afterPublication }
				} else {
					displayFailure = { reason: 'server', status: response.status, afterPublication }
				}
				return
			}
			jobId = payload.jobId
			status = 'enqueued'
			startWatching(jobId)
		} catch (error) {
			if (disposed) return
			status = 'failed'
			checkingAfterPublication = false
			publishingPaths = []
			const details = error instanceof Error ? error.message : String(error)
			if (afterPublication || details) {
				displayFailure = { reason: 'detail', details, afterPublication }
			}
		}
	}

	function getChanges({ syncRemote, afterPublication = false }: CheckOptions) {
		if (disposed || busy) return
		checkingAfterPublication = afterPublication
		auditRunId = ''
		trigger('/api/admin/publish/audit', { bisync: syncRemote }, 'audit', afterPublication)
	}

	function handlePublish() {
		if (!canPublish) return
		const checkedRunId = auditRunId
		const filePaths = [...selectedPaths]
		auditRunId = ''
		publishingPaths = filePaths
		publicationState = 'none'
		publicationError = ''
		trigger('/api/admin/publish', { auditRunId: checkedRunId, filePaths }, 'publish')
	}

	onMount(() => {
		if (initial && (initial.run.state === 'running' || initial.run.state === 'waiting')) {
			startWatching(initial.run.jobId)
		} else {
			getChanges({ syncRemote: false, afterPublication: initialPublication !== null })
		}
	})
	onDestroy(() => {
		disposed = true
		eventSource?.close()
	})

	let timelinePhases = $derived(latestPhases(phases))
	let completedStages = $derived(
		timelinePhases.filter((phase) => phase.status === 'completed' || phase.status === 'skipped')
			.length
	)
	let totalStages = $derived(timelinePhases.length)
	let statusError = $derived(
		status === 'failed' ||
			streamDisconnected ||
			displayFailure !== null ||
			(!busy &&
				(publicationState === 'failed' || outcomes.some((outcome) => outcome.state === 'failed')))
	)
	let showStatus = $derived(
		streamDisconnected ||
			displayFailure !== null ||
			busy ||
			status === 'idle' ||
			status === 'failed' ||
			publicationState !== 'none' ||
			(auditRunId !== '' && missingPreselection) ||
			(pendingDiff !== null && !hasChanges(pendingDiff))
	)
</script>

<section class="publish-view">
	<header class="publish-header">
		<h1>Publish</h1>
		<div class="check-actions">
			<button
				type="button"
				class="check-action"
				onclick={() => getChanges({ syncRemote: false })}
				disabled={busy}
			>
				<ArrowClockwise aria-hidden="true" /> Check
			</button>
			<button
				type="button"
				class="check-action"
				onclick={() => getChanges({ syncRemote: true })}
				disabled={busy}
				title="Sync archive with remote, then check"
			>
				<ArrowsClockwise aria-hidden="true" /> Sync &amp; Check
			</button>
		</div>
	</header>

	<div class="publish-panel">
		{#if showStatus}
			<div class="status-line" class:is-error={statusError} role={statusError ? 'alert' : 'status'}>
				<span
					class="status-icon"
					class:spin={!statusError && (busy || status === 'idle')}
					aria-hidden="true"
				>
					{#if statusError}
						<XCircleFill />
					{:else if busy || status === 'idle'}
						<CircleNotchBold />
					{:else}
						<CheckCircleFill />
					{/if}
				</span>
				<span>
					{#if streamDisconnected}
						Connection lost — refresh to reconnect.
					{:else if displayFailure}
						{#if displayFailure.afterPublication}Could not refresh pending changes.
						{/if}
						{#if displayFailure.reason === 'pending-refresh'}
							Could not refresh pending changes. Check again.
						{:else if displayFailure.reason === 'checked-changes'}
							Could not load checked changes. Check again.
						{:else if displayFailure.reason === 'publication-refresh'}
							Could not refresh publication results. Check again.
						{:else if displayFailure.reason === 'conflict'}
							Another publication operation is running. Try again when it finishes.
						{:else if displayFailure.reason === 'server'}
							Server error: {displayFailure.status}
						{:else if displayFailure.reason === 'stream'}
							{#if displayFailure.details}{displayFailure.details}{:else}Stream error{/if}
						{:else}
							{displayFailure.details}
						{/if}
					{:else if busy && checkingAfterPublication}
						Checking remaining changes…
					{:else if status === 'idle'}
						Checking changes…
					{:else if status === 'submitting'}
						Starting…
					{:else if status === 'enqueued'}
						Waiting for worker…
					{:else if status === 'running'}
						{#if activeKind === 'publish'}
							Publishing{#if totalStages > 0}
								· {completedStages}/{totalStages}{:else}…{/if}
						{:else}
							Checking changes…
						{/if}
					{:else if publicationState === 'failed'}
						{#if publicationError}{publicationError}{:else}Publish failed{/if}
					{:else if publicationState === 'complete'}
						{#if outcomes.some((outcome) => outcome.state === 'failed')}Published with errors{:else}Published{/if}
					{:else if status === 'failed'}
						{#if activeKind === 'publish'}Publish failed{:else}Check failed{/if}
					{:else if auditRunId && missingPreselection}
						No pending additions or updates for this item.
					{:else}
						Up to date
					{/if}
				</span>
			</div>
		{/if}

		{#if hasTableRows}
			<PublishTable
				diff={pendingDiff}
				{outcomes}
				order={fileOrder}
				bind:selectedPaths
				{publishingPaths}
				disabled={busy || !auditRunId}
			/>
		{/if}

		{#if canPublish}
			<footer class="action-bar">
				<Button onclick={handlePublish}>
					{#if selectedPaths.length > 0}Publish{:else if pendingDiff?.pieces.pruned.length}Apply
						removals{:else}Apply schema changes{/if}
				</Button>
			</footer>
		{/if}
	</div>

	<PublishDetails
		schemas={currentDiff?.schemas ?? null}
		schemasAlwaysIncluded={auditRunId !== ''}
		{phases}
		{logs}
	/>
</section>

<style>
	.publish-view {
		max-width: 860px;
		margin: 0 auto;
		padding: var(--space-8) var(--space-4);
		color: var(--color-on-surface);
		font-size: var(--font-size-xs);
		line-height: 1.4;
	}

	.publish-header,
	.action-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: var(--space-3);
	}

	.publish-header {
		margin-bottom: var(--space-4);
	}
	h1 {
		margin: 0;
		font-size: var(--font-size-normal);
	}

	.check-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
		margin-left: auto;
	}

	.check-action {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-2);
		border: none;
		background: none;
		font: inherit;
		color: var(--color-on-surface-variant);
		cursor: pointer;
	}

	.check-action:hover {
		color: var(--color-primary);
	}
	.check-action:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}
	button:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	.status-line {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin-bottom: var(--space-3);
		min-height: 44px;
		color: var(--color-on-surface-variant);
	}

	.status-icon {
		display: inline-flex;
		flex-shrink: 0;
	}
	.is-error {
		color: var(--color-error);
	}

	.action-bar {
		justify-content: flex-end;
		align-items: flex-start;
		margin-top: var(--space-4);
	}

	.spin {
		animation: spin 1s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
