<script lang="ts">
	import CodeSnippetIcon from '@luzzle/web.templates/icons/code-snippet'
	import IconListing from '#lib/templates/icon-listing.svelte'

	let { data } = $props()
</script>

<IconListing Icon={CodeSnippetIcon} {data} />
