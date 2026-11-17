<script lang="ts">
	import PosterIcon from '@luzzle/web.templates/icons/poster'
	import IconListing from '#lib/templates/icon-listing.svelte'

	let { data } = $props()
</script>

<IconListing Icon={PosterIcon} {data} />
