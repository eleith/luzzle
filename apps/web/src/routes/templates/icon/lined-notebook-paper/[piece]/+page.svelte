<script lang="ts">
	import LinedNotebookPaperIcon from '@luzzle/web.templates/icons/lined-notebook-paper'
	import IconListing from '#lib/templates/icon-listing.svelte'

	let { data } = $props()
</script>

<IconListing Icon={LinedNotebookPaperIcon} {data} />
