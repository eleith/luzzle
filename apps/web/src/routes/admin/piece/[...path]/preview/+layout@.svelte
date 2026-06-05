<script lang="ts">
	import '@luzzle/web.theme/styles/reset.css'
	import '@luzzle/web.theme/styles/base.css'
	import '@luzzle/web.theme/styles/markdown.css'
	import '$lib/ui/styles/theme.build.css'

	const { children } = $props()
</script>

{@render children()}
