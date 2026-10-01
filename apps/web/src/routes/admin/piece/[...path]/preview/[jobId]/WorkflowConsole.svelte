<script lang="ts">
	import ProgressConsole from '$lib/components/ProgressConsole.svelte'
	import type { ProgressPhase, ProgressLog, ProgressStatusText } from '$lib/components/progress.js'

	interface Props {
		status: string
		errorMessage?: string
		phases: ProgressPhase[]
		logs: Record<string, ProgressLog[]>
	}

	let { status, errorMessage = '', phases, logs }: Props = $props()

	const statusText: Record<string, ProgressStatusText> = {
		expired: {
			title: 'Preview expired',
			description: 'Assets are purged after 2 days. Re-run the preview from the editor.'
		},
		enqueued: { title: 'Enqueued', description: 'Waiting for worker…' },
		running: { title: 'Rendering preview', durationLabel: 'elapsed' },
		failed: { title: 'Preview failed', durationLabel: 'stopped at' },
		completed: { title: 'Preview completed', durationLabel: 'total time' }
	}
</script>

<ProgressConsole {status} statusText={statusText[status]} {phases} {logs} {errorMessage} />
