<script lang="ts">
	import ArticlePage from '@luzzle/web.templates/pages/article'
	import TemplatePage from '#lib/templates/page.svelte'

	let { data } = $props()
</script>

<TemplatePage Page={ArticlePage} piece={data.piece} tags={data.tags} />
