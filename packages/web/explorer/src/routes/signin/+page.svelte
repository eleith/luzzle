<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte'
	import { signIn } from '@auth/sveltekit/client'
	import { page } from '$app/state'

	const redirectTo = $derived(page.url.searchParams.get('redirectTo') || '/editor')
</script>

<section>
	<Button onclick={() => signIn('oidc', { callbackUrl: redirectTo })}>login (oidc)</Button>
</section>

<style>
	section {
		display: flex;
		height: calc(100vh - 300px);
		justify-content: center;
		align-items: center;
	}
</style>
