<script lang="ts">
	import BookPage from '@luzzle/web.templates/pages/book'
	import TemplatePage from '#lib/templates/page.svelte'

	let { data } = $props()
</script>

<TemplatePage Page={BookPage} piece={data.piece} tags={data.tags} />
