<script lang="ts">
	import PieceForm from '$lib/pieces/components/PieceForm.svelte'
	import Button from '$lib/components/ui/Button.svelte'
	import { DropdownMenu } from 'bits-ui'
	import DotsThreeVertical from 'virtual:icons/ph/dots-three-vertical'
	import { goto } from '$app/navigation'

	let { data } = $props()
	let dialog: HTMLDialogElement
	let fields = $state(data.fields)
</script>

<dialog bind:this={dialog}>
	<form method="post" action="?/delete">
		<p>Are you sure you want to delete this piece?</p>
		<p>This action cannot be undone.</p>
		<div
			style="display:flex; justify-content: flex-end; gap: var(--space-2); margin-top: var(--space-4);"
		>
			<Button variant="outline" onclick={() => dialog.close()}>cancel</Button>
			<Button variant="error" type="submit">delete</Button>
		</div>
	</form>
</dialog>

{#snippet buttons()}
	<div style="display:flex; gap: var(--space-2);">
		<Button type="submit">save</Button>
		<a href="/pieces/list/{data.file}">
			<Button variant="outline">cancel</Button>
		</a>
	</div>

	<DropdownMenu.Root>
		<DropdownMenu.Trigger class="button button-variant-outline">
			<DotsThreeVertical />
		</DropdownMenu.Trigger>
		<DropdownMenu.Portal>
			<DropdownMenu.Content sideOffset={8} forceMount>
				{#snippet child({ open, props, wrapperProps })}
					{#if open}
						<div {...wrapperProps} class="dropdown-content">
							<div {...props}>
								<DropdownMenu.Item onSelect={() => goto(`/pieces/generate/${data.file}`)}>
									{#snippet child({ props })}
										<div class="dropdown-item" {...props}>generate</div>
									{/snippet}
								</DropdownMenu.Item>
								<DropdownMenu.Item onSelect={() => dialog.showModal()}>
									{#snippet child({ props })}
										<div class="dropdown-item destructive" {...props}>delete</div>
									{/snippet}
								</DropdownMenu.Item>
							</div>
						</div>
					{/if}
				{/snippet}
			</DropdownMenu.Content>
		</DropdownMenu.Portal>
	</DropdownMenu.Root>
{/snippet}

<PieceForm
	action="?/edit"
	schema={data.schema}
	values={fields}
	originalValues={data.fields}
	note={data.note || ''}
	{buttons}
/>

<style>
	.dropdown-content {
		background-color: var(--colors-surface-container-highest);
		border: 1px solid var(--colors-outline);
		border-radius: var(--radii-small);
		min-width: 160px;
		box-shadow: var(--shadows-raised);
	}

	.dropdown-item {
		display: flex;
		align-items: center;
		padding: var(--space-3);
		cursor: pointer;
		color: var(--colors-on-surface);
		gap: var(--space-2);
		border-radius: var(--radii-small);
		width: 100%;
		text-align: left;
		background: none;
		border: none;
		text-transform: uppercase;
	}

	.dropdown-item:hover {
		background-color: var(--colors-surface-container-low);
		outline: none;
	}

	.destructive {
		color: var(--colors-error);
	}

	dialog {
		position: fixed;
		transform: translate(-50%, -50%);
		top: 50%;
		left: 50%;
		border: 1px solid var(--colors-outline);
		background-color: var(--colors-surface);
		color: var(--colors-on-surface);
		padding: var(--space-6);
		border-radius: var(--radii-medium);
		box-shadow: var(--shadows-raised);
	}

	dialog::backdrop {
		background-color: rgba(0, 0, 0, 0.5);
	}
</style>
