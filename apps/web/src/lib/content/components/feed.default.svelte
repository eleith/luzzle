<script lang="ts">
	import type { FeedPageProps } from '$lib/content/types.js'

	let { feedUrl, feedType, feedLabel, feedItems, components }: FeedPageProps = $props()
	const { ContentBanner } = components

	let isCopied = $state<boolean>(false)
	let inputElement: HTMLInputElement

	const title = $derived(
		feedType === 'tag' ? `RSS feed for tag: ${feedLabel}` : `RSS feed for ${feedLabel}`
	)

	async function copyToClipboard() {
		if (!inputElement) return
		await navigator.clipboard.writeText(feedUrl)
		isCopied = true
		inputElement.select()
		setTimeout(() => {
			isCopied = false
			inputElement.blur()
		}, 2000)
	}
</script>

<ContentBanner showRandom={true} showHome={true} />

<div class="content-wrapper">
	<aside aria-label="RSS subscription info">
		<section>
			<div>
				<h2>What is this?</h2>
				RSS (Really Simple Syndication) allows for people to subscribe to updates without having to provide
				their email address.<br />
				<br />
				View the raw data files: <a href="feed.xml">XML</a> |
				<a href="feed.json">JSON</a>
				| <a href="feed.md">Markdown</a>
			</div>
		</section>
		<hr />
		<p id="rss-instructions">Copy the link and paste it into an RSS reader</p>
		<div class="copy-container">
			<input
				id="rss-url-input"
				aria-label="RSS feed URL"
				aria-describedby="rss-instructions"
				bind:this={inputElement}
				type="text"
				readonly
				value={feedUrl}
				onclick={copyToClipboard}
				class="input"
			/>
			<button onclick={copyToClipboard} class="button">{isCopied ? 'copied' : 'copy'}</button>
		</div>
	</aside>

	<main>
		<header>
			<h1>{title}</h1>
		</header>

		<div class="pieces-list">
			{#each feedItems as piece (piece.id)}
				<a href="/pieces/{piece.type}/{piece.slug}" class="item-card">
					<div class="item-link">
						<span class="item-date">
							{new Date(piece.date_consumed || piece.date_added).toLocaleDateString('en-US', {
								year: 'numeric',
								month: 'short',
								day: 'numeric',
								timeZone: 'UTC'
							})}
						</span>
						<span class="item-title">{piece.title}</span>
					</div>
					{#if piece.note}
						<div class="item-note">
							{piece.note}
						</div>
					{/if}
				</a>
			{/each}
		</div>
	</main>
</div>

<style>
	.content-wrapper {
		margin: var(--space-4) auto;
		padding: 0 var(--space-4);
		width: 85%;
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		max-width: clamp(500px, 66.6666%, 1000px);
	}

	aside {
		background: var(--color-surface);
		border: 1px solid var(--color-surface-container-high);
		padding: 1em 1.5em;
		border-radius: var(--radius-medium);
	}

	aside hr {
		margin-top: 1em;
		margin-bottom: 1em;
	}

	.copy-container {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin-top: var(--space-3);
	}

	.copy-container input {
		flex-grow: 1;
		padding: var(--space-2);
		border-radius: var(--radius-medium);
		border: 1px solid var(--color-surface-container-high);
		background-color: var(--color-surface-container-low);
		color: var(--color-on-surface);
		cursor: pointer;
		transition: all 0.2s ease-in-out;
	}

	.copy-container input:hover {
		border-color: var(--color-outline);
	}

	h1 {
		font-size: var(--font-size-large);
		margin-bottom: 0.5em;
	}

	.pieces-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.item-card {
		background-color: var(--color-surface-container-low);
		border-radius: var(--radius-large);
		border: 1px solid var(--color-surface-container-high);
		padding: var(--space-4);
		transition: all 0.2s ease-in-out;
		display: block;
		text-decoration: none;
	}

	.item-card:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-raised);
		border-color: var(--color-outline);
	}

	.item-link {
		display: flex;
		flex-direction: column;
		text-decoration: none;
		color: var(--color-on-surface);
	}

	.item-title {
		font-size: 1.2em;
		font-weight: 500;
		color: var(--color-on-surface);
	}

	.item-card:hover .item-title {
		color: var(--color-primary);
	}

	.item-date {
		color: var(--color-on-surface);
		font-size: 0.7em;
		font-weight: 300;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: var(--space-1);
	}

	.item-note {
		margin-top: var(--space-3);
		line-height: 1.6;
		font-size: 0.95em;
		color: var(--color-on-surface);
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 4;
		line-clamp: 4;
		overflow: hidden;
	}
</style>
