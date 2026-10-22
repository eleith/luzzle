<script lang="ts">
	import type { FeedPageProps } from '@luzzle/web.templates/site/props'
	import FeedDefault from '@luzzle/web.templates/components/feed.default.svelte'
	import type { PreparedPage } from '$lib/content/types.js'
	import NavBanner from '$lib/components/layout/simple/NavBanner.svelte'
	import SeoHead from '$lib/components/layout/simple/SeoHead.svelte'

	type Props = FeedPageProps['data'] & { presentation: PreparedPage | null }
	let { feed, pieces, presentation }: Props = $props()
</script>

<SeoHead />

<svelte:head>
	<!-- The app owns feed metadata even when no navigation is requested. -->
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html presentation?.head ?? ''}
</svelte:head>

{#key feed.url}
	{#if presentation}
		{#if presentation.navBanner !== null}
			<NavBanner showRandom {...presentation.navBanner} />
		{/if}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html presentation.body}
	{:else}
		<NavBanner showRandom />
		<FeedDefault data={{ feed, pieces }} />
	{/if}
{/key}
