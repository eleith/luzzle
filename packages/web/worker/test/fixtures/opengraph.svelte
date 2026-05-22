<script lang="ts">
	type Props = {
		title: string
		subtitle?: string
		accent: string
	}

	let { title, subtitle, accent }: Props = $props()
</script>

<section class="card" style="--accent: {accent};">
	<h1>{title}</h1>
	{#if subtitle}
		<p class="subtitle">{subtitle}</p>
	{/if}
</section>

<style>
	.card {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 2rem;
		background: oklch(from var(--accent) 0.95 0.05 h);
		border-bottom: 4px solid var(--accent);
	}

	.card h1 {
		font-size: 2rem;
		font-weight: 700;
		margin: 0;
		color: var(--accent);
	}

	.subtitle {
		font-size: 1rem;
		color: oklch(from var(--accent) 0.4 c h);
	}
</style>
