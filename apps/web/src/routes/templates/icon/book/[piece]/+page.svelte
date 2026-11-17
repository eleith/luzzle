<script lang="ts">
	import BookIcon from '@luzzle/web.templates/icons/book'
	import IconListing from '#lib/templates/icon-listing.svelte'

	let { data } = $props()
</script>

<IconListing Icon={BookIcon} {data} />
