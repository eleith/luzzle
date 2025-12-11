<script lang="ts">
	import { page } from '$app/state'
	let { data } = $props()
</script>

<svelte:head>
	<link
		rel="alternate"
		type="application/rss+xml"
		title="RSS feed | all"
		href={`${page.data.config.url.app}/rss/pieces/feed.xml`}
	/>
</svelte:head>

<section class="intro">
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html data.root_html}
</section>

<style>
	section.intro {
		margin: var(--space-4);
		margin-bottom: var(--space-8);
		margin-left: auto;
		margin-right: auto;
		width: 85%;
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		padding-bottom: var(--space-5);
	}
</style>
