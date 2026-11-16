<script lang="ts">
	import DefaultPage from '@luzzle/web.templates/pages/default'
	import TemplatePage from '#lib/templates/page.svelte'

	let { data } = $props()
</script>

<TemplatePage Page={DefaultPage} piece={data.piece} tags={data.tags} />
