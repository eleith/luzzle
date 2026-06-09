<script lang="ts">
	import type { PageErrorProps } from '$lib/content/types.js'

	let { status, message = 'an unexpected error occurred', components }: PageErrorProps = $props()
	const { ContentBanner } = components
</script>

<ContentBanner showHome={true} />

<main id="main-content" class="custom-error-page">
	<section class="section">
		<div class="custom-card">
			<h1>error {status}</h1>
			<h2>system malfunction</h2>
			<p>{message}</p>
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
	}

	.section {
		max-width: 600px;
		margin: auto;
		text-align: center;
	}

	.custom-card {
		background: var(--color-surface-container-low);
		border: 1px solid var(--color-outline-variant);
		border-radius: var(--radius-large);
		padding: var(--space-8) var(--space-6);
		box-shadow: var(--shadow-raised);
	}

	.custom-card h1 {
		font-size: var(--font-size-xl);
		font-family: var(--font-mono);
		color: var(--color-error);
		text-transform: uppercase;
		margin: 0;
		margin-bottom: var(--space-2);
	}

	.custom-card h2 {
		font-size: var(--font-size-xs);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-on-surface-variant);
		margin-bottom: var(--space-6);
	}

	.custom-card p {
		color: var(--color-on-surface-variant);
		margin-bottom: var(--space-8);
		font-size: var(--font-size-small);
	}

	.btn-primary {
		display: inline-block;
		background-color: var(--color-primary);
		color: var(--color-on-primary);
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
