<script lang="ts">
	import type { Page404Props } from '$lib/content/types.js'

	let { message, components }: Page404Props = $props()
	const { ContentBanner } = components
</script>

<ContentBanner showHome={true} />

<main id="main-content" class="error-page">
	<section class="section">
		<div class="error-card">
			<h1>404</h1>
			<h2>page not found</h2>
			<p>{message || 'there are no pieces at this path.'}</p>
			<a href="/" class="home-button">go home</a>
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
		font-size: 6rem;
		font-family: var(--font-mono);
		color: var(--color-primary);
		margin: 0;
	}

	.error-card h2 {
		font-size: var(--font-size-lg);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: var(--space-4);
	}

	.error-card p {
		color: var(--color-on-surface-variant);
		margin-bottom: var(--space-8);
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
