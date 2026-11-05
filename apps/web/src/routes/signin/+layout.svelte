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
		padding: 8px 16px;
		color: var(--color-on-surface-variant);
	}

	.signin-tools a {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		min-height: 44px;
		color: inherit;
		text-decoration: none;
		font-size: 14px;
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
		font-size: 20px;
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
		padding: 24px 16px 32px;
	}

	@media (max-width: 30rem) {
		main {
			align-items: flex-start;
			padding-block-start: 20px;
		}
	}
</style>
