<script lang="ts">
	import '$lib/ui/styles/reset.css'
	import '$lib/ui/styles/base.css'
	import '$lib/ui/styles/theme.build.css'

	const { children } = $props()
</script>

{@render children()}
