<script lang="ts">
	import Recipe from '@luzzle/web.templates/pages/recipe'
	import type { ComponentProps } from 'svelte'
	let { props }: { props: ComponentProps<typeof Recipe> } = $props()
</script>

<Recipe {...props} />
<Recipe {...props} />
