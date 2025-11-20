<script lang="ts">
	import { type PiecePageProps } from '@luzzle/web.utils'
	const { piece, tags, Icon, metadata, html_note, helpers }: PiecePageProps = $props()

	let showFullHeader = $state(false)
	const hasMedia = $derived(!!piece.media)

	function toggleHeader() {
		showFullHeader = !showFullHeader
	}
</script>

<section class="header" class:header-media={hasMedia}>
	<button
		class="piece-icon"
		onclick={toggleHeader}
		title="toggle full size"
		class:piece-icon-open={showFullHeader}
	>
		<Icon
			{piece}
			size={{ width: 125 }}
			{metadata}
			tags={tags.map((x) => x.tag as string)}
			lazy={false}
			{helpers}
		/>
	</button>
</section>

<section class="content">
	<section class="details" class:details-media={hasMedia}>
		{#if piece.date_consumed}
			<div class="date">
				{new Date(piece.date_consumed).toLocaleDateString()}
			</div>
		{/if}

		<h1>
			{piece.title}
		</h1>

		{#if piece.note}
			<div>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html html_note}
			</div>
		{/if}

		{#if piece.summary}
			<h2>summary</h2>
			<div>
				{piece.summary}
			</div>
		{/if}

		{#if metadata.url}
			<h2>link</h2>
			<div>
				<a href={metadata.url as string}>{metadata.url}</a>
			</div>
		{/if}

		{#if tags.length}
			<h2>tags</h2>
			<div class="tags-container">
				{#each tags as tag (tag.slug)}
					<a href="/tags/{tag.slug}" class="tag">{tag.tag}</a>
				{/each}
			</div>
		{/if}
	</section>
</section>

<style>
	section.content {
		width: 100%;
		position: relative;
	}

	section.details {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
		justify-content: space-between;
		max-width: 65ch;
		width: 100%;
		margin: 0 auto;
		padding: 0 var(--space-2-5) var(--space-5);
		position: relative;
	}

	section.details-media::before {
		content: '';
		border-top: solid 3px var(--color-surface-container-highest);
		margin: auto;
		width: 100%;
	}

	@media screen and (min-width: 768px) {
		section.details {
			padding: 0 0 var(--space-5);
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

	section.details h1 {
		font-size: var(--font-size-xl);
	}

	section.details h2 {
		font-size: var(--font-size-large);
	}

	section.details .date {
		font-size: var(--font-size-xxs);
	}

	.tags-container {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
		font-size: var(--font-size-xxs);
	}

	.tags-container .tag {
		text-decoration: none;
		color: var(--color-on-surface);
		opacity: 0.6;
		padding: var(--space-1);
		border-radius: 5px;
		border: 1px solid var(--color-surface-container-lowest);
		transition: all 0.1s ease-in-out;
	}

	.tags-container .tag:hover {
		color: var(--color-primary);
		border-color: var(--color-primary);
		background-color: var(--color-surface-container-lowest);
		opacity: 1;
	}
</style>
