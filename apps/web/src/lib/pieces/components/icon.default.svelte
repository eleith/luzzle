<script lang="ts">
	import DefaultIcon from '@luzzle/web.templates/components/icon.default.svelte'
	import type { PieceIconProps } from '$lib/pieces/helpers'

	let props: PieceIconProps = $props()
</script>

<DefaultIcon {...props} />
