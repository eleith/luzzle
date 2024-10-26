<script lang="ts">
	import CaretRightIcon from 'virtual:icons/ph/caret-right-thin'
	import CaretLeftIcon from 'virtual:icons/ph/caret-left-thin'
	import PieceIcon from '$lib/pieces/components/icon/index.svelte'
	import { marked } from 'marked'
	import { PUBLIC_ASSETS_CDN_URL } from '$env/static/public'

	let { data } = $props()
	const metadata = JSON.parse(data.piece.json_metadata) || {}
	const imagesDir = `${PUBLIC_ASSETS_CDN_URL}/images/pieces`
</script>

<svelte:head>
	<title>{data.piece.title}</title>
	<meta name="description" content={data.piece.summary} />
	<meta property="og:title" content={data.piece.title} />
	<meta property="og:description" content={data.piece.summary} />
	<meta
		property="og:image"
		content="{imagesDir}/{data.piece.type}/{data.piece.slug}/opengraph.png"
	/>
	<meta property="og:type" content="article" />
	<!--
  <meta property="og:site_name" content="" />
  <meta property="og:url" content="{window.location.href}" />
  -->
	<meta property="og:locale" content="en_US" />
	<link rel="prefetch" href="/pieces/{data.piece.type}/{data.piece.slug}.md" />
</svelte:head>

<section class="header">
	{#if data.previous}
		<a href="/pieces/{data.previous.type}/{data.previous.slug}">
			<CaretLeftIcon style="font-size: 4em;" />
		</a>
	{:else}
		<CaretLeftIcon style="font-size: 4em; color: var(--colors-surface-dim);" />
	{/if}
	{#key data.piece.id}
		<PieceIcon piece={data.piece} size="large" lazy={false} />
	{/key}
	{#if data.next}
		<a href="/pieces/{data.next.type}/{data.next.slug}">
			<CaretRightIcon style="font-size: 4em;" />
		</a>
	{:else}
		<CaretRightIcon style="font-size: 4em; color: var(--colors-surface-dim);" />
	{/if}
</section>

<section class="details">
	<h1>
		{data.piece.title}
	</h1>

	{#if data.piece.date_consumed}
		<div style="font-size:var(--font-sizes-small);">
			{new Date(data.piece.date_consumed).toLocaleDateString()}
		</div>
	{/if}

	{#if data.piece.note}
		<h2 style="margin-top: var(--space-5);">notes</h2>
		<div>
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html marked(data.piece.note)}
		</div>
	{/if}

	{#if metadata.url}
		<h3 style="margin-top: var(--space-5);">link</h3>
		<div style="font-size:var(--font-sizes-small);">
			<a href={metadata.url}>{metadata.url}</a>
		</div>
	{/if}

	{#if data.piece.summary}
		<h3 style="margin-top: var(--space-5);">summary</h3>
		<div>
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html marked(data.piece.summary)}
		</div>
	{/if}

	{#if data.tags.length}
		<h3 style="margin-top: var(--space-5);">tags</h3>
		<div style="margin-top: var(--space-5);font-size:var(--font-sizes-small);">
			{#each data.tags as tag, i}
				<a href="/tags/{tag.slug}">{tag.name}</a>
				{#if i < data.tags.length - 1}
					ꞏ&nbsp;
				{/if}
			{/each}
		</div>
	{/if}
</section>

<style>
	section.details {
		display: flex;
		flex-direction: column;
		margin: auto;
		gap: var(--space-5);
		justify-content: space-between;
		line-height: 1.5;
		width: 85%;
		padding-right: var(--space-2-5);
		padding-left: var(--space-2-5);
	}

	@media screen and (min-width: 768px) {
		section.details {
			width: clamp(500px, 66.6666%, 1000px);
		}
	}

	section.header {
		display: flex;
		justify-content: space-around;
		align-items: center;
		padding-top: var(--space-10);
		background: var(--colors-surface-container-lowest);
		clip-path: polygon(0 0, 100% 0, 100% 80%, 0 65%);
		margin-bottom: -20px;
	}

	section.header > a {
		color: var(--colors-on-surface);
	}

	section.header > a:hover {
		color: var(--colors-primary);
	}
</style>
