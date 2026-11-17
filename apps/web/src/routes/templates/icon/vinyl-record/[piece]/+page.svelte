<script lang="ts">
	import VinylRecordIcon from '@luzzle/web.templates/icons/vinyl-record'
	import IconListing from '#lib/templates/icon-listing.svelte'

	let { data } = $props()
</script>

<IconListing Icon={VinylRecordIcon} {data} />
