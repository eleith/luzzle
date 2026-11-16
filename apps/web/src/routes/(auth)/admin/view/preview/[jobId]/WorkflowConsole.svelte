<script lang="ts">
	import StepLog from '#lib/components/StepLog.svelte'
	import { latestPhases, type ProgressPhase, type ProgressLog } from '#lib/components/progress.js'
	import XCircleFill from 'virtual:icons/ph/x-circle-fill'

	interface Props {
		status: string
		errorMessage?: string
		phases: ProgressPhase[]
		logs: Record<string, ProgressLog[]>
	}

	let { status, errorMessage = '', phases, logs }: Props = $props()
	const timelinePhases = $derived(latestPhases(phases))
</script>

{#if errorMessage && status === 'failed'}
	<div class="error-strip">
		<XCircleFill class="error-icon" />
		<span>{errorMessage}</span>
	</div>
{/if}

{#if timelinePhases.length > 0}
	<div class="timeline">
		{#each timelinePhases as phase (phase.phase)}
			<StepLog {phase} logs={logs[phase.phase] ?? []} />
		{/each}
	</div>
{/if}

<style>
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
		min-width: 0;
	}
</style>
