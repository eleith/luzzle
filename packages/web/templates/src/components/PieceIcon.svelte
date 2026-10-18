<script>
	import { getRequest } from '../request.js';
	import DefaultIcon from './DefaultIcon.svelte';

	let { piece, size, lazy = false, active = false } = $props();
	const request = getRequest();
	const Icon = $derived(request.iconForPiece?.(piece) ?? DefaultIcon);
	const options = $derived({ size, lazy, active });
</script>

<Icon data={{ piece }} {options} helpers={request.helpers} />
