<script lang="ts">
	import type { ComponentProps } from 'svelte'
	import Layout from '../+layout.svelte'
	import Signin from '../+page.svelte'

	let { data }: { data: ComponentProps<typeof Signin>['data'] } = $props()
</script>

<Layout>
	<Signin {data} params={{}} form={null} />
</Layout>
