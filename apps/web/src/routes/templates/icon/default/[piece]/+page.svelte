<script lang="ts">
	import DefaultIcon from '@luzzle/web.templates/icons/default'
	import IconListing from '#lib/templates/icon-listing.svelte'

	let { data } = $props()
</script>

<IconListing Icon={DefaultIcon} {data} />
