<script lang="ts">
	import BrowserWindowIcon from '@luzzle/web.templates/icons/browser-window'
	import IconListing from '#lib/templates/icon-listing.svelte'

	let { data } = $props()
</script>

<IconListing Icon={BrowserWindowIcon} {data} />
