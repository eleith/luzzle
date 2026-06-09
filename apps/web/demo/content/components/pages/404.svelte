<script lang="ts">
	import type { Page404Props } from '$lib/content/types.js'

	let { message, components }: Page404Props = $props()
	const { ContentBanner } = components
</script>

<ContentBanner showHome={true} />

<main id="main-content" class="custom-error-page">
	<section class="section">
		<div class="custom-card">
			<h1>404</h1>
			<h2>lost in space</h2>
			<p>{message || 'the piece or page you are looking for has floated away.'}</p>
			<a href="/" class="btn-primary">Return to Base</a>
		</div>
	</section>
</main>

<style>
	.custom-error-page {
		display: flex;
		flex-direction: column;
		justify-content: center;
		min-height: 60vh;
		padding: var(--space-8);
		position: relative;
		overflow: hidden;
	}

	.section {
		max-width: 600px;
		margin: auto;
		text-align: center;
		z-index: 1;
	}

	.custom-card {
		background: var(--color-surface-container-low);
		border: 1px solid var(--color-outline-variant);
		border-radius: var(--radius-large);
		padding: var(--space-8) var(--space-6);
		box-shadow: var(--shadow-raised);
		position: relative;
	}

	.custom-card h1 {
		font-size: 8rem;
		font-family: var(--font-mono);
		color: var(--color-tertiary);
		margin: 0;
		line-height: 1;
	}

	.custom-card h2 {
		font-size: var(--font-size-md);
		text-transform: uppercase;
		letter-spacing: 0.15em;
		margin-bottom: var(--space-4);
		color: var(--color-on-surface);
	}

	.custom-card p {
		color: var(--color-on-surface-variant);
		margin-bottom: var(--space-8);
		font-size: var(--font-size-small);
	}

	.btn-primary {
		display: inline-block;
		background-color: var(--color-tertiary);
		color: var(--color-on-tertiary);
		padding: var(--space-2) var(--space-6);
		border-radius: var(--radius-medium);
		text-decoration: none;
		text-transform: uppercase;
		font-weight: 600;
		letter-spacing: 0.05em;
		transition: transform 0.2s ease;
	}

	.btn-primary:hover {
		transform: translateY(-2px);
	}
</style>
