<script lang="ts">
	import { mergePhaseLogs } from '#lib/components/progress.js'
	import PieceOverview from '#lib/pieces/viewer/PieceOverview.svelte'
	import { previewOutputUrl } from '@luzzle/web.pieces'
	import PreviewFacts from './PreviewFacts.svelte'
	import PreviewLogs from './PreviewLogs.svelte'
	import type { PageProps } from './$types'

	let { data }: PageProps = $props()
	function fileUrl(path: string) {
		return previewOutputUrl(path, data.job)
	}

	const logsMap = $derived(mergePhaseLogs({}, data.logs ?? []))
</script>

{#if data.status === 'completed'}
	<main id="main-content">
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
	</main>
{/if}
