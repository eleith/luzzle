<script lang="ts">
	import '@luzzle/web.theme/styles/reset.css'
	import '@luzzle/web.theme/styles/base.css'
	import '@luzzle/web.theme/styles/markdown.css'
	import { page } from '$app/state'
	import { isPiecesPath } from '#lib/pieces/navigation.js'
	import EditSourceShortcut from '#lib/components/layout/simple/EditSourceShortcut.svelte'

	const { children } = $props()
</script>

{@render children()}

{#if page.status === 200 && isPiecesPath(page.url.pathname) && page.data.piece}
	<EditSourceShortcut pieceType={page.data.piece.type} slug={page.data.piece.slug} />
{/if}
