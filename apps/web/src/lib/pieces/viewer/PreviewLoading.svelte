<script lang="ts">
	import CircleNotch from 'virtual:icons/ph/circle-notch'

	let { label }: { label: string } = $props()
</script>

<div class="preview-loading" role="status">
	<CircleNotch aria-hidden="true" focusable="false" />
	<span class="visually-hidden">{label}</span>
</div>

<style>
	.preview-loading {
		display: grid;
		place-items: center;
		width: 100%;
		height: 100%;
		color: var(--color-primary);
	}
	.preview-loading :global(svg) {
		width: 2rem;
		height: 2rem;
		animation: preview-spin 1s linear infinite;
	}
	@keyframes preview-spin {
		to {
			transform: rotate(360deg);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.preview-loading :global(svg) {
			animation: none;
		}
	}
</style>
