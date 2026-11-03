<script lang="ts">
	import { enhance } from '$app/forms'
	import Button from '#lib/components/ui/Button.svelte'
	import PieceOverview from '#lib/pieces/viewer/PieceOverview.svelte'
	import type { PageProps } from './$types'

	let { data }: PageProps = $props()
</script>

<main id="main-content">
	<PieceOverview title="Preview" fileUrl={() => undefined}>
		<p>Preview the saved contents of <code>{data.file}</code>.</p>
		<form method="post" use:enhance>
			<Button type="submit">Start preview</Button>
		</form>
	</PieceOverview>
</main>
