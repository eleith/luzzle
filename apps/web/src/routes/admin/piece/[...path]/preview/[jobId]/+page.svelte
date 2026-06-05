<script lang="ts">
	import WorkflowConsole from './WorkflowConsole.svelte'
	import type { PageProps } from './$types'

	let { data }: PageProps = $props()

	type PhaseLog = {
		job_id: string
		phase: string
		line_number: number
		ts: number
		level: string
		message: string
	}

	let logsMap = $derived.by(() => {
		const map: Record<string, PhaseLog[]> = {}
		if (data.logs) {
			for (const log of data.logs) {
				if (!map[log.phase]) map[log.phase] = []
				map[log.phase].push(log)
			}
		}
		return map
	})
</script>

<div class="workflow-tab-container">
	<header class="preview-status-header">
		<h1>Preview</h1>
		<div class="meta">{data.file}</div>
	</header>

	<WorkflowConsole status="completed" phases={data.phases ?? []} logs={logsMap} />
</div>

<style>
	.workflow-tab-container {
		padding: var(--space-8) var(--space-4);
		max-width: 860px;
		margin: 0 auto;
		color: var(--color-on-surface);
		font-size: var(--font-size-xs);
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
		font-size: var(--font-size-normal);
		font-weight: var(--font-weight-bold);
		letter-spacing: -0.01em;
	}

	.preview-status-header .meta {
		font-family: var(--font-mono);
		font-size: var(--font-size-xxs);
		color: var(--color-on-surface-variant);
	}
</style>
