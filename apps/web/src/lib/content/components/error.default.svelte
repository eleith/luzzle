<script lang="ts">
	import { resolve } from '$app/paths'
	import ContentBanner from './ContentBanner.svelte'
	import Markdown from '#lib/content/markdown/Markdown.svelte'

	type Props = {
		status: number
		message?: string
		/** Trusted server-rendered Markdown only; never arbitrary author HTML. */
		html?: string
		home?: boolean
	}
	let { status, message, html, home = true }: Props = $props()
</script>

<ContentBanner showHome={true} />

<main id="main-content" class="error-page">
	<section class="section">
		<div class="error-card">
			{#if html !== undefined}
				<Markdown {html} />
			{:else}
				<h1>error {status}</h1>
				<p>
					{#if message !== undefined}
						{message}
					{:else}
						an unexpected error occurred
					{/if}
				</p>
			{/if}
			{#if home}
				<a href={resolve('')} class="home-button">go home</a>
			{/if}
		</div>
	</section>
</main>

<style>
	.error-page {
		display: flex;
		flex-direction: column;
		justify-content: center;
		min-height: 60vh;
		padding: var(--space-8);
	}

	.section {
		max-width: 600px;
		margin: auto;
		text-align: center;
	}

	.error-card h1 {
		font-size: var(--font-size-xl);
		font-family: var(--font-mono);
		color: var(--color-error);
		text-transform: uppercase;
		margin: 0;
		margin-bottom: var(--space-4);
	}

	.error-card p {
		color: var(--color-on-surface-variant);
		margin-bottom: var(--space-8);
		font-size: var(--font-size-md);
	}

	.home-button {
		display: inline-block;
		background-color: var(--color-primary);
		color: var(--color-on-primary);
		padding: var(--space-2) var(--space-5);
		border-radius: var(--radius-small);
		text-decoration: none;
		text-transform: uppercase;
		font-weight: 500;
	}
</style>
