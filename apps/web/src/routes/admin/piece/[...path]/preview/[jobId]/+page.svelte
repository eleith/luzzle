<script lang="ts">
	import type { ProgressLog } from '$lib/components/progress'
	import PieceOverview from '$lib/pieces/viewer/PieceOverview.svelte'
	import { previewOutputUrl } from '$lib/pieces/preview/output-url'
	import PreviewFacts from './PreviewFacts.svelte'
	import PreviewLogs from './PreviewLogs.svelte'
	import type { PageProps } from './$types'

	let { data }: PageProps = $props()
	function fileUrl(path: string) {
		return previewOutputUrl(path, data.job)
	}

	let logsMap = $derived.by(() => {
		const map: Record<string, ProgressLog[]> = {}
		for (const log of data.logs ?? []) {
			if (!map[log.phase]) map[log.phase] = []
			map[log.phase].push(log)
		}
		return map
	})
</script>

{#if data.status === 'completed'}
	<PieceOverview
		title={data.piece?.title ?? 'Preview'}
		assets={data.outputs}
		{fileUrl}
		assetsHeading="Preview assets"
	>
		<PreviewFacts
			file={data.file}
			phases={data.phases ?? []}
			type={data.piece?.type}
			status="completed"
			createdAt={data.createdAt}
			finishedAt={data.finishedAt}
		/>
		<PreviewLogs status="completed" phases={data.phases ?? []} logs={logsMap} />
	</PieceOverview>
{/if}
