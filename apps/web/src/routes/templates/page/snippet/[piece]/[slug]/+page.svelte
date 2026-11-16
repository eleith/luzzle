<script lang="ts">
	import SnippetPage from '@luzzle/web.templates/pages/snippet'
	import TemplatePage from '#lib/templates/page.svelte'

	let { data } = $props()
</script>

<TemplatePage Page={SnippetPage} piece={data.piece} tags={data.tags} />
