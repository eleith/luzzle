<script lang="ts">
	let { stylesheets = [] }: { stylesheets?: string[] } = $props()

	// A CSS string or comment can contain a literal HTML raw-text end tag.
	function escapeStyleText(css: string) {
		return css.replace(/<(?=\/style)/gi, '\\3c ')
	}
</script>

<svelte:head>
	{#each stylesheets as sheet (sheet)}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- Trusted template CSS escaped for an HTML style element. -->
		{@html `<style>${escapeStyleText(sheet)}</style>`}
	{/each}
</svelte:head>
