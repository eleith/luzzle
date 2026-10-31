<script lang="ts">
	import type { OutputValue } from './assets'
	import { formatSource, type SourceToken } from './source'
	import '#lib/components/editor/themes/token-colors.css'

	let { value, label }: { value: OutputValue; label: string } = $props()
	const source = $derived(formatSource(value.value ?? '', value.mime))
	let highlighted = $state.raw<{
		source: string
		mime: string
		tokens: SourceToken[]
	} | null>(null)
	const tokens = $derived(
		highlighted?.source === source && highlighted.mime === value.mime
			? highlighted.tokens
			: [{ text: source, classes: '' }]
	)

	$effect(() => {
		const text = source
		const mime = value.mime
		let active = true
		import('./source-highlight.js')
			.then(({ highlightSource }) => highlightSource(text, mime))
			.then((tokens) => {
				if (active) highlighted = { source: text, mime, tokens }
			})
			.catch(() => {
				// The full plain source remains available if highlighting cannot load.
			})
		return () => {
			active = false
		}
	})
</script>

<!-- Keyboard focus makes the bounded read-only source scrollable without a mouse. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<pre
	class="syntax-highlight"
	title={value.mime}
	tabindex="0"
	role="region"
	aria-label="{label} source"><code
		>{#each tokens as token (token)}<span class={token.classes}>{token.text}</span>{/each}</code
	></pre>

<style>
	pre {
		box-sizing: border-box;
		min-width: 0;
		max-width: 100%;
		max-height: 24rem;
		margin: 0;
		padding: var(--space-3);
		overflow: auto;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		tab-size: 2;
		font-family: var(--font-mono-name), monospace;
		font-size: var(--font-size-xs);
		color: var(--editor-foreground, var(--color-on-surface));
		background: var(--editor-background, var(--color-surface));
	}
</style>
