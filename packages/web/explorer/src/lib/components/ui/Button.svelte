<script lang="ts">
	import { Button as ButtonPrimitive } from 'bits-ui'
	import type { Snippet } from 'svelte'

	type Props = {
		variant?: 'primary' | 'secondary' | 'tertiary' | 'error' | 'outline'
		type?: 'button' | 'submit' | 'reset'
		onclick?: (e: MouseEvent) => void
		children: Snippet
		class?: string
		style?: string
	}

	let {
		variant = 'primary',
		type = 'button',
		onclick,
		children,
		class: className = '',
		style,
		...rest
	}: Props = $props()
</script>

<ButtonPrimitive.Root
	{type}
	{onclick}
	class="button {className}"
	data-variant={variant}
	{style}
	{...rest}
>
	{@render children()}
</ButtonPrimitive.Root>
