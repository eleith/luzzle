<script lang="ts">
	import MusicPage from '@luzzle/web.templates/pages/music'
	import TemplatePage from '#lib/templates/page.svelte'

	let { data } = $props()
</script>

<TemplatePage Page={MusicPage} piece={data.piece} tags={data.tags} />
