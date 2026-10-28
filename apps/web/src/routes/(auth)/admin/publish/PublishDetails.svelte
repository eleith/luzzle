<script lang="ts">
	import { tick } from 'svelte'
	import type { PiecesDiff } from '@luzzle/core'
	import { latestPhases, type PhaseProgress, type PhaseLog } from './report.js'
	import CaretRight from 'virtual:icons/ph/caret-right'
	import CheckCircleFill from 'virtual:icons/ph/check-circle-fill'
	import XCircleFill from 'virtual:icons/ph/x-circle-fill'
	import CircleNotchBold from 'virtual:icons/ph/circle-notch-bold'
	import MinusCircle from 'virtual:icons/ph/minus-circle'
	import LockSimpleFill from 'virtual:icons/ph/lock-simple-fill'
	import LockSimpleOpenFill from 'virtual:icons/ph/lock-simple-open-fill'

	type Props = {
		schemas?: PiecesDiff['schemas'] | null
		schemasAlwaysIncluded?: boolean
		phases?: readonly PhaseProgress[]
		logs?: Readonly<Record<string, readonly PhaseLog[]>>
	}

	let { schemas = null, schemasAlwaysIncluded = false, phases = [], logs = {} }: Props = $props()

	const schemaKinds = ['added', 'updated', 'pruned'] as const
	let hasSchemaChanges = $derived(
		schemas !== null && schemaKinds.some((kind) => schemas[kind].length > 0)
	)
	let timelinePhases = $derived(latestPhases([...phases]))
	let overallDuration = $derived.by(() => {
		if (phases.length === 0 || !phases[0].started_at) return 0
		return (phases[phases.length - 1].finished_at || Date.now()) - phases[0].started_at
	})

	let open = $state(false)
	let disclosure = $state<HTMLDetailsElement>()
	let scrollLocks = $state<Record<string, boolean>>({})
	const viewports = new Map<string, HTMLDivElement>()

	function viewport(node: HTMLDivElement, phase: string) {
		viewports.set(phase, node)
		return {
			destroy() {
				if (viewports.get(phase) === node) viewports.delete(phase)
			}
		}
	}

	function handleScroll(phase: string, event: Event) {
		const node = event.currentTarget as HTMLDivElement
		if (!disclosure?.open || !node.clientHeight) return
		scrollLocks[phase] = node.scrollHeight - node.scrollTop - node.clientHeight < 10
	}

	$effect(() => {
		if (!open || !disclosure) return
		const lockedPhases = timelinePhases
			.filter((phase) => logs[phase.phase]?.length && (scrollLocks[phase.phase] ?? true))
			.map((phase) => phase.phase)
		let canceled = false
		// Wait for new rows and local viewport actions before measuring. Opening an
		// already completed run follows the same path as receiving more log rows.
		tick().then(() => {
			if (canceled || !disclosure?.open) return
			for (const phase of lockedPhases) {
				const node = viewports.get(phase)
				if (node?.isConnected && (scrollLocks[phase] ?? true)) {
					node.scrollTop = node.scrollHeight
				}
			}
		})
		return () => {
			canceled = true
		}
	})

	function formatDuration(ms: number) {
		if (ms < 0) return '0s'
		const seconds = Math.floor(ms / 1000)
		if (seconds < 60) return `${seconds}s`
		return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
	}
</script>

{#if phases.length > 0 || hasSchemaChanges}
	<details class="disclosure run-details" bind:this={disclosure} bind:open>
		<summary>
			<span class="disclosure-icon" aria-hidden="true"><CaretRight /></span> Details
		</summary>
		{#if hasSchemaChanges && schemas}
			<section class="schema-changes">
				<h2>
					{#if schemasAlwaysIncluded}
						Piece types · always included
					{:else}
						Piece types
					{/if}
				</h2>
				<ul>
					{#each schemaKinds as kind (kind)}
						{#each schemas[kind] as name (name)}
							<li>
								<span class="badge">
									{#if kind === 'added'}New{:else if kind === 'updated'}Updated{:else}Removed{/if}
								</span>
								{name}
							</li>
						{/each}
					{/each}
				</ul>
			</section>
		{/if}
		{#if phases.length > 0}
			<p class="details-meta">{timelinePhases.length} stages · {formatDuration(overallDuration)}</p>
			<div class="timeline">
				{#each timelinePhases as phase (phase.phase)}
					<div class="phase">
						<div class="phase-row">
							<span class="phase-icon status-{phase.status}" aria-hidden="true">
								{#if phase.status === 'completed'}
									<CheckCircleFill />
								{:else if phase.status === 'running'}
									<span class="spin"><CircleNotchBold /></span>
								{:else if phase.status === 'failed'}
									<XCircleFill />
								{:else if phase.status === 'skipped'}
									<MinusCircle />
								{:else}
									<span class="phase-dot"></span>
								{/if}
							</span>
							<span class="phase-name">{phase.phase}</span>
							{#if phase.message}<span class="phase-message">{phase.message}</span>{/if}
						</div>
						{#if logs[phase.phase]?.length}
							<div class="log-console">
								<div class="log-header">
									<span>{logs[phase.phase].length} lines</span>
									<button
										type="button"
										class="scroll-lock"
										onclick={() => {
											scrollLocks[phase.phase] = !(scrollLocks[phase.phase] ?? true)
										}}
										aria-pressed={scrollLocks[phase.phase] ?? true}
										title={(scrollLocks[phase.phase] ?? true)
											? 'Auto-scroll locked'
											: 'Auto-scroll unlocked'}
									>
										{#if scrollLocks[phase.phase] ?? true}<LockSimpleFill
											/>{:else}<LockSimpleOpenFill />{/if}
									</button>
								</div>
								<div
									class="log-viewport"
									use:viewport={phase.phase}
									onscroll={(event) => handleScroll(phase.phase, event)}
								>
									{#each logs[phase.phase] as log (JSON.stringify([log.job_id, log.line_number]))}
										<div
											class="log-row"
											class:is-error={log.level === 'error' || log.level === 'stderr'}
										>
											<span class="log-timestamp"
												>{new Date(log.ts).toISOString().split('T')[1].slice(0, -5)}</span
											>
											<span>{log.message}</span>
										</div>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</details>
{/if}

<style>
	h2 {
		margin: 0 0 var(--space-2);
		font-size: var(--font-size-xs);
	}
	.scroll-lock {
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
	button:focus-visible,
	summary:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}
	.disclosure-icon {
		display: inline-flex;
		flex-shrink: 0;
	}
	.is-error {
		color: var(--color-error);
	}
	.disclosure > summary {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		width: fit-content;
		min-height: 44px;
		list-style: none;
		color: var(--color-on-surface-variant);
		cursor: pointer;
	}
	.disclosure > summary::-webkit-details-marker {
		display: none;
	}
	.disclosure[open] > summary > .disclosure-icon {
		transform: rotate(90deg);
	}
	.run-details {
		margin-top: var(--space-4);
		border-top: 1px solid var(--color-outline-variant);
	}
	.schema-changes {
		margin: var(--space-3) 0;
	}
	.schema-changes ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}
	.schema-changes li {
		margin: var(--space-2) 0;
	}
	.details-meta {
		color: var(--color-on-surface-variant);
		font-size: var(--font-size-xxs);
	}
	.badge {
		font-size: var(--font-size-xxs);
		padding: 2px var(--space-1);
		background: var(--color-surface-container-high);
		border-radius: var(--radius-small);
		color: var(--color-on-surface-variant);
	}
	.timeline {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}
	.phase-row {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: var(--space-2);
	}
	.phase-icon {
		display: inline-flex;
		width: 16px;
		color: var(--color-on-surface-variant);
	}
	.status-completed {
		color: var(--color-primary);
	}
	.status-running {
		color: var(--color-secondary);
	}
	.status-failed {
		color: var(--color-error);
	}
	.phase-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		border: 1px solid var(--color-outline-variant);
	}
	.phase-name {
		font-family: var(--font-mono-name), monospace;
	}
	.phase-message {
		font-size: var(--font-size-xxs);
		color: var(--color-on-surface-variant);
		overflow-wrap: anywhere;
	}
	.log-console {
		margin-top: var(--space-2);
		border: 1px solid var(--color-outline-variant);
		border-radius: var(--radius-small);
		background: var(--color-surface-container-lowest);
	}
	.log-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-1) var(--space-2);
		border-bottom: 1px solid var(--color-outline-variant);
		color: var(--color-on-surface-variant);
		font-size: var(--font-size-xxs);
	}
	.log-viewport {
		max-height: 260px;
		overflow-y: auto;
		padding: var(--space-2);
		font-family: var(--font-mono-name), monospace;
		font-size: var(--font-size-xxs);
	}
	.log-row {
		display: flex;
		gap: var(--space-2);
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
	.log-timestamp {
		flex-shrink: 0;
		color: var(--color-on-surface-variant);
	}
	.spin {
		display: inline-flex;
		animation: spin 1s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
