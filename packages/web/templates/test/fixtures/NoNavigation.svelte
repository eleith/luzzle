<script>
	import { getContext } from 'svelte';

	const request = getContext('fixture-request');
</script>

<p class="fallback" data-request={request}>fallback</p>
