<script lang="ts">
	import type { ProgressPhase, ProgressLog } from '$lib/components/progress'
	import WorkflowConsole from './WorkflowConsole.svelte'

	interface Props {
		status: string
		phases: ProgressPhase[]
		logs: Record<string, ProgressLog[]>
		errorMessage?: string
	}

	let { status, phases, logs, errorMessage }: Props = $props()
	const sectionId = $props.id()
</script>

<section aria-labelledby="{sectionId}-heading">
	<h2 id="{sectionId}-heading">Preview logs</h2>
	<WorkflowConsole {status} {phases} {logs} {errorMessage} />
</section>

<style>
	section {
		min-width: 0;
		font-size: var(--font-size-xs);
		line-height: 1.4;
	}
	h2 {
		font-size: var(--font-size-normal);
		font-weight: var(--font-weight-bold);
		margin-bottom: var(--space-4);
	}
</style>
