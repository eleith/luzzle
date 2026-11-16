<script lang="ts">
	import RecipePage from '@luzzle/web.templates/pages/recipe'
	import TemplatePage from '#lib/templates/page.svelte'

	let { data } = $props()
</script>

<TemplatePage Page={RecipePage} piece={data.piece} tags={data.tags} />
