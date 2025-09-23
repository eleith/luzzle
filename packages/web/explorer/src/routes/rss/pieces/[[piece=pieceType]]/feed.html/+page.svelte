<script lang="ts">
	import Nav from '$lib/components/layout/simple/nav.svelte'
	import { page } from '$app/state'

	let { data } = $props()
	let isCopied = $state<boolean>(false)
	let inputElement: HTMLInputElement
	let typeFolder = data.type ? `/${data.type}` : ''
	let rssUrl = `${page.data.config.url.app}/rss/pieces${typeFolder}/feed.xml`

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
	<title>{data.type ? `RSS feed for ${data.type}` : 'RSS feed'}</title>
	<meta
		name="description"
		content={`An RSS feed for ${data.type ? data.type : 'all pieces'} from
${page.data.config.text.title}.`}
	/>

	<!-- RSS Discovery Link -->
	<link
		rel="alternate"
		type="application/rss+xml"
		title={data.type ? `RSS feed for ${data.type}` : 'RSS feed'}
		href={rssUrl}
	/>

	<!-- OpenGraph Tags -->
	<meta property="og:title" content={data.type ? `RSS feed for ${data.type}` : 'RSS feed'} />
	<meta
		property="og:description"
		content={`An RSS feed for ${data.type ? data.type : 'all pieces'} from
${page.data.config.text.title}.`}
	/>
	<meta property="og:image" content="{page.data.config.url.luzzle_assets}/images/opengraph.png" />
	<meta property="og:type" content="website" />
	<meta property="og:locale" content="en_US" />
</svelte:head>

<main>
	<Nav />
	<section class="content-wrapper">
		<aside class="callout">
			<h2>What is this?</h2>
			<p>
				This is a human-readable HTML page that represents an RSS feed. RSS (Really Simple
				Syndication) is a standard way to get updates from websites without having to visit them.
			</p>
			<div>
				To subscribe, copy the link below and paste it into your favorite feed reader:
				<div class="copy-container">
					<input
						bind:this={inputElement}
						type="text"
						readonly
						value="{page.data.config.url.app}/rss/pieces{data.type ? `/${data.type}` : ""}/feed.xml"
						onclick={copyToClipboard}
						class="input"
					/>
					<button onclick={copyToClipboard} class="button">{isCopied ? 'copied' : 'copy'}</button>
				</div>
			</div>
			<p class="raw-links">
				Or, view the raw data files:
				<a href="feed.xml">XML</a> |
				<a href="feed.json">JSON</a> |
				<a href="feed.md">Markdown</a>
			</p>
		</aside>

		<header>
			<h1>
				{#if data.type}
					RSS feed for {data.type}
				{:else}
					RSS feed for all pieces
				{/if}
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
		background: var(--colors-surface-container-low);
		border: 1px solid var(--colors-surface-container-high);
		padding: 1em 1.5em;
		border-radius: var(--radii-medium);
	}

	aside.callout a {
		word-break: break-all;
	}

	.copy-container {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin-top: var(--space-1);
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

	.raw-links {
		margin-top: var(--space-3);
		font-size: 0.9em;
	}

	header {
		margin-bottom: var(--space-2);
	}

	.pieces-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.item-card {
		background-color: var(--colors-surface-container);
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
