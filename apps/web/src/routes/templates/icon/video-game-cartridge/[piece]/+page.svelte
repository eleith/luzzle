<script lang="ts">
	import VideoGameCartridgeIcon from '@luzzle/web.templates/icons/video-game-cartridge'
	import IconListing from '#lib/templates/icon-listing.svelte'

	let { data } = $props()
</script>

<IconListing Icon={VideoGameCartridgeIcon} {data} />
