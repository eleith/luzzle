<script lang="ts">
	import Nav from '$lib/components/layout/simple/nav.svelte'
	import { page } from '$app/state'

	let { data } = $props()
	let isCopied = $state<boolean>(false)
	let inputElement: HTMLInputElement
	let rssUrl = `${page.data.config.url.app}/rss/tags/${data.tag}/feed.xml`

	async function copyToClipboard() {
		if (!inputElement) return

		await navigator.clipboard.writeText(rssUrl)
		isCopied = true

		inputElement.select()

		setTimeout(() => {
			isCopied = false
			inputElement.blur()
		}, 2000)
	}
</script>

<svelte:head>
	<link
		rel="alternate"
		type="application/rss+xml"
		title={`RSS feed for tag: ${data.tag}`}
		href={rssUrl}
	/>
</svelte:head>

<main>
	<Nav />
	<section class="content-wrapper">
		<aside class="callout">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html data.block}
			<hr />
			<p>Copy the link and paste it into an RSS reader</p>
			<div class="copy-container">
				<input
					bind:this={inputElement}
					type="text"
					readonly
					value={rssUrl}
					onclick={copyToClipboard}
					class="input"
				/>
				<button onclick={copyToClipboard} class="button">{isCopied ? 'copied' : 'copy'}</button>
			</div>
		</aside>

		<header>
			<h1>
				RSS feed for tag: {data.tag}
			</h1>
		</header>

		<main class="pieces-list">
			{#each data.pieces as piece (piece.id)}
				<a href="/pieces/{piece.type}/{piece.slug}" class="item-card">
					<div class="item-link">
						<span class="item-date">
							{new Date(piece.date_consumed || piece.date_added).toLocaleDateString('en-US', {
								year: 'numeric',
								month: 'short',
								day: 'numeric'
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
		</main>
	</section>
</main>

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

	aside.callout {
		background: var(--colors-surface-container-high);
		border: 1px solid var(--colors-surface-container-highest);
		padding: 1em 1.5em;
		border-radius: var(--radii-medium);
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
		border-radius: var(--radii-medium);
		border: 1px solid var(--colors-surface-container-high);
		background-color: var(--colors-surface-container);
		color: var(--colors-on-surface);
		cursor: pointer;
		transition: all 0.2s ease-in-out;
	}

	.copy-container input:hover {
		border-color: var(--colors-outline);
	}

	h1 {
		font-size: var(--font-sizes-large);
	}

	.pieces-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.item-card {
		background-color: var(--colors-surface-container-low);
		border-radius: var(--radii-large);
		border: 1px solid var(--colors-surface-container-high);
		padding: var(--space-4);
		transition: all 0.2s ease-in-out;
		display: block;
		text-decoration: none;
	}

	.item-card:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadows-raised);
		border-color: var(--colors-outline);
	}

	.item-link {
		display: flex;
		flex-direction: column;
		text-decoration: none;
		color: var(--colors-on-surface);
	}

	.item-title {
		font-size: 1.2em;
		font-weight: 500;
		color: var(--colors-on-surface);
	}

	.item-card:hover .item-title {
		color: var(--colors-primary);
	}

	.item-date {
		color: var(--colors-outline);
		font-size: 0.9em;
		margin-bottom: var(--space-1);
	}

	.item-note {
		margin-top: var(--space-3);
		line-height: 1.6;
		font-size: 0.95em;
		color: var(--colors-on-surface-variant);
	}
</style>
