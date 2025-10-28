<script lang="ts">
	const { piece, tags, Icon, metadata, html } = $props()
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
		<Icon {piece} size="m" lazy={false} />
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
				{@html html.note}
			</div>
		{/if}

		{#if piece.summary}
			<h2>summary</h2>
			<div>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html html.summary}
			</div>
		{/if}

		{#if metadata.url}
			<h2>link</h2>
			<div>
				<a href={metadata.url}>{metadata.url}</a>
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
		margin: auto;
		gap: var(--space-5);
		justify-content: space-between;
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

	@media screen and (min-width: 768px) {
		section.details {
			width: clamp(500px, 66.6666%, 1000px);
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
		font-size: var(--font-sizes-xl);
	}

	section.details h2 {
		font-size: var(--font-sizes-large);
	}

	section.details .date {
		font-size: var(--font-sizes-xxs);
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
