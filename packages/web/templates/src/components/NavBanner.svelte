<script>
	import { recordNavigation } from '../request.js';
	import { untrack } from '../runtime/svelte.js';

	const inputs = $props();
	untrack(() => recordNavigation(inputs));
</script>
