<script lang="ts">
	import RecipeCardIcon from '@luzzle/web.templates/icons/recipe-card'
	import IconListing from '#lib/templates/icon-listing.svelte'

	let { data } = $props()
</script>

<IconListing Icon={RecipeCardIcon} {data} />
