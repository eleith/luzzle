<script lang="ts">
	import CaretRightIcon from 'virtual:icons/ph/caret-right-thin'
	import CaretLeftIcon from 'virtual:icons/ph/caret-left-thin'
	import PieceIcon from '$lib/pieces/components/icon/index.svelte'
	import { marked } from 'marked'
	import { PUBLIC_IMAGES_URL } from '$env/static/public'

	let { data } = $props()
	const metadata = JSON.parse(data.piece.json_metadata) || {}
	const imagesDir = `${PUBLIC_IMAGES_URL}/images/pieces`
	let showFullHeader = $state(false)

	function toggleHeader() {
		showFullHeader = !showFullHeader
	}
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

	{#if data.previous}
		<link rel="prefetch" href="/pieces/{data.previous.type}/{data.previous.slug}" />
	{/if}

	{#if data.next}
		<link rel="prefetch" href="/pieces/{data.next.type}/{data.next.slug}" />
	{/if}
</svelte:head>

<section class="header" class:header-reveal={showFullHeader}>
	{#if data.previous}
		<a href="/pieces/{data.previous.type}/{data.previous.slug}" class="navigation-list">
			<CaretLeftIcon />
		</a>
	{:else}
		<div class="navigation-list">
			<CaretLeftIcon style="color: var(--colors-surface-dim);"/>
		</div>	
	{/if}
	{#key data.piece.id}
		<button class="piece-icon" onclick={toggleHeader} title="toggle full size">
			<PieceIcon piece={data.piece} size="large" lazy={false} />
		</button>
	{/key}
	{#if data.next}
		<a href="/pieces/{data.next.type}/{data.next.slug}" class="navigation-list">
			<CaretRightIcon />
		</a>
	{:else}
		<div class="navigation-list">
			<CaretRightIcon style="color: var(--colors-surface-dim);"/>
		</div>
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
			{#each data.tags as tag, i (tag.slug)}
				<a href="/tags/{tag.slug}">{tag.tag}</a>
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

	section.header .navigation-list {
		display: none;
		font-size: 4em;
	}

	@media screen and (min-width: 768px) {
		section.details {
			width: clamp(500px, 66.6666%, 1000px);
		}

		section.header .navigation-list {
			display: block;
		}
	}

	section.header {
		display: flex;
		justify-content: space-around;
		align-items: center;
		background: var(--colors-surface-container-lowest);
		max-height: 225px;
		padding-bottom: var(--space-5);
		overflow: hidden;
		border-bottom: 2px solid var(--colors-outline);
		transition: max-height 0.5s ease-in-out;
	}

	section.header-reveal {
		max-height: 500px;
	}

	section.header > a {
		color: var(--colors-on-surface);
	}

	section.header > a:hover {
		color: var(--colors-primary);
	}

	.piece-icon {
		align-self: baseline;
		cursor: pointer;
		background: none;
		border: none;
	}
</style>
