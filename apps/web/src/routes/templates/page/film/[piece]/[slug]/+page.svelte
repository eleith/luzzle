<script lang="ts">
	import FilmPage from '@luzzle/web.templates/pages/film'
	import TemplatePage from '#lib/templates/page.svelte'

	let { data } = $props()
</script>

<TemplatePage Page={FilmPage} piece={data.piece} tags={data.tags} />
