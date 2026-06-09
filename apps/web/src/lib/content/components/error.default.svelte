<script lang="ts">
	import type { PageErrorProps } from '$lib/content/types.js'

	let { status, message = 'an unexpected error occurred', components }: PageErrorProps = $props()
	const { ContentBanner } = components
</script>

<ContentBanner showHome={true} />

<main id="main-content" class="error-page">
	<section class="section">
		<div class="error-card">
			<h1>error {status}</h1>
			<p>{message}</p>
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
