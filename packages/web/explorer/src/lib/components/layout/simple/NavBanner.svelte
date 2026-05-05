<script lang="ts">
	import NavigationIcon from 'virtual:icons/ph/arrow-up-left'
	import SearchIcon from 'virtual:icons/ph/magnifying-glass'
	import { page } from '$app/state'
	import type { Snippet } from 'svelte'
	import NavigationProgressBar from './NavigationProgressBar.svelte'
	import ThemeToggle from './ThemeToggle.svelte'

	type Props = {
		background?: string
		showHome?: boolean
		showSearch?: boolean
		showThemeToggle?: boolean
		showProgress?: boolean
		items?: {
			left?: Snippet<[]>
			right?: Snippet<[]>
		}
	}
	const {
		background = 'transparent',
		showHome = true,
		showSearch = true,
		showThemeToggle = true,
		showProgress = true,
		items
	}: Props = $props()
</script>

{#if showProgress}
	<NavigationProgressBar />
{/if}

<nav class="banner" style:--banner-background-color={background}>
	<div class="left">
		{#if showHome && page.url.pathname !== '/'}
			<a href="/" aria-label="main page"><NavigationIcon style="font-size: 1em;" /></a>
		{/if}
		{#if items?.left}
			{@render items.left()}
		{/if}
	</div>
	<div class="right">
		{#if showSearch}
			{#await import('./SearchDialog.svelte')}
				<a href="/search" aria-label="search">
					<SearchIcon style="font-size: 1em;" />
				</a>
			{:then { default: SearchDialog }}
				<SearchDialog />
			{:catch}
				<a href="/search" aria-label="search">
					<SearchIcon style="font-size: 1em;" />
				</a>
			{/await}
		{/if}
		{#if items?.right}
			{@render items.right()}
		{/if}
		{#if showThemeToggle}
			<ThemeToggle />
		{/if}
	</div>
</nav>

<style>
	.banner {
		display: flex;
		justify-content: space-between;
		background-color: var(--banner-background-color);
	}

	.left {
		padding: var(--space-5);
		display: flex;
		align-items: left;
	}

	.right {
		padding: var(--space-5);
		display: flex;
		align-items: right;
		gap: var(--space-5);
	}

	.banner :global(a),
	.banner :global(button) {
		display: inline-flex;
		min-width: 24px;
		min-height: 24px;
		cursor: pointer;
		color: var(--color-on-surface);
		background: transparent;
		border: none;
	}

	.banner :global(a):hover,
	.banner :global(button):hover {
		color: var(--color-primary);
	}
</style>
