<script lang="ts">
	import SeoHead from '$lib/components/layout/simple/SeoHead.svelte'
	import CodeBlockIcon from 'virtual:icons/ph/code-block'
	import { page } from '$app/state'
	import { onMount } from 'svelte'

	const { children } = $props()

	let isAdmin = $state(false)
	const editUrl = $derived(`/editor/open/${page.params.piece}/${page.params.slug}`)

	onMount(() => {
		isAdmin = localStorage.getItem('luzzle.admin') === 'true'
	})
</script>

<SeoHead />
{@render children()}

{#if isAdmin}
	<a href={editUrl} class="edit-shortcut" aria-label="edit source">
		<CodeBlockIcon />
	</a>
{/if}

<style>
	.edit-shortcut {
		position: fixed;
		bottom: var(--space-4);
		right: var(--space-4);
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border-radius: var(--radius-full);
		background-color: var(--color-surface-container-high);
		color: var(--color-on-surface);
		box-shadow: var(--shadow-raised);
		font-size: 1.25em;
		opacity: 0.6;
		transition: opacity 0.15s;
		z-index: 50;
	}

	.edit-shortcut:hover {
		opacity: 1;
		color: var(--color-primary);
	}
</style>
