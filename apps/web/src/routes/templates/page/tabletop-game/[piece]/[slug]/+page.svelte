<script lang="ts">
	import TabletopGamePage from '@luzzle/web.templates/pages/tabletop-game'
	import TemplatePage from '#lib/templates/page.svelte'

	let { data } = $props()
</script>

<TemplatePage Page={TabletopGamePage} piece={data.piece} tags={data.tags} />
