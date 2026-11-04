<script lang="ts">
	import { resolve } from '$app/paths'
	import ArrowLeftIcon from 'virtual:icons/ph/arrow-left'
	import SeoHead from '#lib/components/layout/simple/SeoHead.svelte'
	import ThemeToggle from '#lib/components/layout/simple/ThemeToggle.svelte'

	const { children } = $props()
</script>

<SeoHead />

<div class="signin-shell">
	<header class="signin-tools">
		<a href={resolve('')}>
			<ArrowLeftIcon aria-hidden="true" focusable="false" />
			Back to site
		</a>
		<ThemeToggle />
	</header>
	<main id="main-content">
		{@render children()}
	</main>
</div>

<style>
	.signin-shell {
		min-height: 100svh;
		display: flex;
		flex-direction: column;
	}

	.signin-tools {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-3) var(--space-5);
		color: var(--color-on-surface-variant);
	}

	.signin-tools a {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		min-height: 44px;
		color: inherit;
		text-decoration: none;
		font-size: var(--font-size-small);
	}

	.signin-tools a:hover {
		text-decoration: underline;
	}

	.signin-tools :global(button) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 44px;
		min-height: 44px;
		border: none;
		border-radius: var(--radius-small);
		background: transparent;
		color: inherit;
		font-size: var(--font-size-large);
		cursor: pointer;
	}

	.signin-tools a:focus-visible,
	.signin-tools :global(button:focus-visible) {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	main {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 0;
		padding: var(--space-6) var(--space-4) var(--space-8);
	}

	@media (max-width: 30rem) {
		main {
			align-items: flex-start;
			padding-block-start: var(--space-5);
		}
	}
</style>
