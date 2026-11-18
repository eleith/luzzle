<script lang="ts">
	import CodeBlockIcon from 'virtual:icons/ph/code-block'
	import { resolve } from '$app/paths'
	import { onMount } from 'svelte'

	let { pieceType, slug }: { pieceType: string; slug: string } = $props()
	let isAdmin = $state(false)

	onMount(() => {
		isAdmin = localStorage.getItem('luzzle.admin') === 'true'
	})
</script>

{#if isAdmin}
	<aside aria-label="Admin Actions">
		<a
			href={resolve(`admin/open/${pieceType}/${slug}`)}
			class="edit-shortcut"
			aria-label="edit source"
		>
			<CodeBlockIcon />
		</a>
	</aside>
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
