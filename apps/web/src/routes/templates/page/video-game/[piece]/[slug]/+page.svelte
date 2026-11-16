<script lang="ts">
	import VideoGamePage from '@luzzle/web.templates/pages/video-game'
	import TemplatePage from '#lib/templates/page.svelte'

	let { data } = $props()
</script>

<TemplatePage Page={VideoGamePage} piece={data.piece} tags={data.tags} />
