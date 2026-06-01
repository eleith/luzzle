<script lang="ts">
	import { Button as ButtonPrimitive } from 'bits-ui'
	import type { Snippet } from 'svelte'

	type Props = {
		variant?: 'primary' | 'secondary' | 'tertiary' | 'error' | 'outline' | 'link'
		type?: 'button' | 'submit' | 'reset'
		form?: string
		onclick?: (e: MouseEvent) => void
		children: Snippet
		class?: string
		style?: string
		disabled?: boolean
		formaction?: string
		formenctype?:
			| 'application/x-www-form-urlencoded'
			| 'multipart/form-data'
			| 'text/plain'
			| null
			| undefined
	}

	let {
		variant = 'primary',
		type = 'button',
		form,
		onclick,
		children,
		class: className = '',
		disabled = false,
		style,
		...rest
	}: Props = $props()
</script>

<ButtonPrimitive.Root
	{type}
	{form}
	{onclick}
	class="button {className}"
	data-variant={variant}
	{disabled}
	{style}
	{...rest}
>
	{@render children()}
</ButtonPrimitive.Root>
