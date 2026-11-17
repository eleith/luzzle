<script lang="ts">
	import PreviewLoading from './PreviewLoading.svelte'

	let { view, failed = false }: { view: 'page' | 'icon'; failed?: boolean } = $props()
</script>

<main id="main-content" class="template-status" class:loading={!failed} aria-label="{view} preview">
	{#if failed}
		<p role="alert">The {view} preview could not be loaded.</p>
		<button type="button" onclick={() => window.location.reload()}>Reload</button>
	{:else}
		<PreviewLoading label="Loading {view} preview…" />
		<noscript><p>JavaScript is required to display the {view} preview.</p></noscript>
	{/if}
</main>

<style>
	.template-status {
		padding: var(--space-8);
		color: var(--color-on-surface);
	}
	.loading {
		display: grid;
		align-content: center;
		min-height: 60svh;
	}
</style>
