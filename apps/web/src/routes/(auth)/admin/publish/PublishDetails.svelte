<script lang="ts">
	import type { PiecesDiff } from '@luzzle/core'
	import { latestPhases, type PhaseProgress, type PhaseLog } from './report.js'
	import StepLog from '#lib/components/StepLog.svelte'

	type Props = {
		schemas?: PiecesDiff['schemas'] | null
		schemasAlwaysIncluded?: boolean
		phases?: readonly PhaseProgress[]
		logs?: Readonly<Record<string, readonly PhaseLog[]>>
	}

	let { schemas = null, schemasAlwaysIncluded = false, phases = [], logs = {} }: Props = $props()

	const schemaKinds = ['added', 'updated', 'pruned'] as const
	const hasSchemaChanges = $derived(
		schemas !== null && schemaKinds.some((kind) => schemas[kind].length > 0)
	)
	const timelinePhases = $derived(latestPhases([...phases]))
</script>

{#if phases.length > 0 || hasSchemaChanges}
	<div class="run-details">
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
		{#if timelinePhases.length > 0}
			<section>
				<h2>Run logs</h2>
				<div class="timeline">
					{#each timelinePhases as phase (phase.phase)}
						<StepLog {phase} logs={logs[phase.phase] ?? []} />
					{/each}
				</div>
			</section>
		{/if}
	</div>
{/if}

<style>
	.run-details {
		margin-top: var(--space-6);
	}
	h2 {
		margin: 0 0 var(--space-3);
		font-size: var(--font-size-normal);
		font-weight: var(--font-weight-bold);
	}
	.schema-changes {
		margin-bottom: var(--space-5);
	}
	.schema-changes ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}
	.schema-changes li {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin: var(--space-2) 0;
	}
	.badge {
		font-size: var(--font-size-xxs);
		padding: var(--space-1) var(--space-2);
		background: var(--color-surface-container-high);
		border-radius: var(--radius-small);
		color: var(--color-on-surface-variant);
	}
	.timeline {
		display: grid;
		gap: var(--space-4);
		min-width: 0;
	}
</style>
