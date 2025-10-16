<script lang="ts">
	import CaretRightIcon from 'virtual:icons/ph/caret-right-thin'
	import CaretLeftIcon from 'virtual:icons/ph/caret-left-thin'
	import PieceIcon from '$lib/pieces/components/icon.svelte'
	import { marked } from 'marked'

	let { data } = $props()
	const metadata = JSON.parse(data.piece.json_metadata) || {}
	const hasMedia = $derived(!!data.piece.media)
	let showFullHeader = $state(false)

	function toggleHeader() {
		showFullHeader = !showFullHeader
	}
</script>

<svelte:head>
	{#if data.previous}
		<link rel="prefetch" href="/pieces/{data.previous.type}/{data.previous.slug}" />
	{/if}

	{#if data.next}
		<link rel="prefetch" href="/pieces/{data.next.type}/{data.next.slug}" />
	{/if}
</svelte:head>

<section class="piece">
	<section class="header" class:header-media={hasMedia}>
		{#if data.previous}
			<a href="/pieces/{data.previous.type}/{data.previous.slug}" class="navigation-list">
				<CaretLeftIcon />
			</a>
		{:else}
			<div class="navigation-list">
				<CaretLeftIcon style="color: var(--colors-surface-dim);" />
			</div>
		{/if}
		{#key data.piece.id}
			<button
				class="piece-icon"
				onclick={toggleHeader}
				title="toggle full size"
				class:piece-icon-open={showFullHeader}
			>
				<PieceIcon piece={data.piece} size="l" lazy={false} />
			</button>
		{/key}
		{#if data.next}
			<a href="/pieces/{data.next.type}/{data.next.slug}" class="navigation-list">
				<CaretRightIcon />
			</a>
		{:else}
			<div class="navigation-list">
				<CaretRightIcon style="color: var(--colors-surface-dim);" />
			</div>
		{/if}
	</section>

	<section class="content">
		<section class="details" class:details-media={hasMedia}>
			<h1>
				{data.piece.title}
			</h1>

			{#if data.piece.date_consumed}
				<div style="font-size:var(--font-sizes-small);">
					{new Date(data.piece.date_consumed).toLocaleDateString()}
				</div>
			{/if}

			{#if data.piece.note}
				<h2>notes</h2>
				<div>
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html marked.parseInline(data.piece.note, { breaks: true })}
				</div>
			{/if}

			{#if metadata.url}
				<h3>link</h3>
				<div style="font-size:var(--font-sizes-small);">
					<a href={metadata.url}>{metadata.url}</a>
				</div>
			{/if}

			{#if data.piece.summary}
				<h3>summary</h3>
				<div>
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html marked.parseInline(data.piece.summary, { breaks: true })}
				</div>
			{/if}

			{#if data.tags.length}
				<h3>tags</h3>
				<div class="tags-container">
					{#each data.tags as tag (tag.slug)}
						<a href="/tags/{tag.slug}" class="tag">{tag.tag}</a>
					{/each}
				</div>
			{/if}
		</section>
	</section>
</section>

<style>
	section.content {
		width: 100%;
		background: var(--colors-surface);
		position: relative;
	}

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
		padding-bottom: var(--space-5);
	}

	section.details-media::before {
		content: '';
		border-top: solid 3px var(--colors-surface-container-highest);
		margin: auto;
		width: 100%;
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
		justify-content: space-between;
		align-items: center;
		padding-top: var(--space-10);
		position: absolute;
		width: 100%;
	}

	section.header button {
		display: none;
	}

	section.header-media {
		justify-content: space-around;
		position: relative;
		width: auto;
		padding-top: 0px;
		padding-bottom: var(--space-5);
	}

	section.header-media button {
		display: block;
	}

	section.piece {
		background-image: linear-gradient(
			to bottom,
			var(--colors-surface-container-lowest),
			transparent 225px
		);
	}

	section.header > a {
		color: var(--colors-on-surface);
	}

	section.header > a:hover {
		color: var(--colors-primary);
	}

	section.header button.piece-icon {
		align-self: baseline;
		cursor: pointer;
		background: none;
		border: none;
		max-height: 175px;
		transition: max-height 0.5s ease-in-out;
	}

	section.header button.piece-icon-open {
		max-height: 620px;
	}

	.tags-container {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
		font-size: var(--font-sizes-xxs);
	}

	.tags-container .tag {
		text-decoration: none;
		color: var(--colors-on-surface);
		opacity: 0.6;
		padding: var(--space-1);
		border-radius: 5px;
		border: 1px solid var(--colors-surface-container-lowest);
		transition: all 0.1s ease-in-out;
	}

	.tags-container .tag:hover {
		color: var(--colors-primary);
		border-color: var(--colors-primary);
		background-color: var(--colors-surface-container-lowest);
		opacity: 1;
	}
</style>
