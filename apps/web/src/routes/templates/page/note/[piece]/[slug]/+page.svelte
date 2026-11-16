<script lang="ts">
	import NotePage from '@luzzle/web.templates/pages/note'
	import TemplatePage from '#lib/templates/page.svelte'

	let { data } = $props()
</script>

<TemplatePage Page={NotePage} piece={data.piece} tags={data.tags} />
