<script>
	import { getContext } from 'svelte';

	const value = getContext('fixture-probe');
</script>

<p data-probe={value}>{value}</p>
