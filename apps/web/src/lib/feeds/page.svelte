<script lang="ts">
	import type { FeedPageProps } from '@luzzle/web.templates/site/props'
	import FeedDefault from '@luzzle/web.templates/components/feed.default.svelte'
	import NavBanner from '$lib/components/layout/simple/NavBanner.svelte'
	import SeoHead from '$lib/components/layout/simple/SeoHead.svelte'
	import Markdown from '$lib/content/markdown/Markdown.svelte'
	import Subscription from './subscription.svelte'

	type Props = FeedPageProps['data'] & { about?: string; links: boolean }
	let { feed, pieces, about, links }: Props = $props()
</script>

<SeoHead />
<NavBanner showRandom />

{#key feed.url}
	{#if about || links}
		<div class="feed-cards">
			{#if about}
				<aside class="about" aria-label="About this feed"><Markdown html={about} /></aside>
			{/if}
			{#if links}
				<Subscription url={feed.url} />
			{/if}
		</div>
	{/if}
	<FeedDefault data={{ feed, pieces }} />
{/key}

<style>
	.feed-cards {
		margin: var(--space-4) auto;
		padding: 0 var(--space-4);
		width: 85%;
		max-width: clamp(500px, 66.6666%, 1000px);
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}
	.about {
		background: var(--color-surface);
		border: 1px solid var(--color-surface-container-high);
		padding: var(--space-5);
		border-radius: var(--radius-medium);
	}
</style>
