<script lang="ts">
	import PlayingCardsIcon from '@luzzle/web.templates/icons/playing-cards'
	import IconListing from '#lib/templates/icon-listing.svelte'

	let { data } = $props()
</script>

<IconListing Icon={PlayingCardsIcon} {data} />
