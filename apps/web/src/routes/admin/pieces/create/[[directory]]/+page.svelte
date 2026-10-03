<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte'
	import Combobox from '$lib/components/ui/Combobox.svelte'
	import type { PageProps } from './$types'

	let { data, form }: PageProps = $props()
	let selectedType = $state(form?.type || data.type)
	let selectedDirectory = $state(form?.directory || data.directory || '.')
	let name = $state(form?.name || '')

	const directoryItems = $derived(
		data.directories.map((dir) => ({ value: dir, label: dir === '.' ? '(root)' : dir }))
	)
	const typeItems = $derived(data.types.map((type) => ({ value: type, label: type })))
</script>

<section class="create">
	<form method="post" action="?/create">
		{#if form?.error}
			<div class="banner error-banner" role="alert">{form.error.message}</div>
		{/if}
		<div class="field">folder</div>
		<div class="field-edit">
			<Combobox name="directory" bind:value={selectedDirectory} items={directoryItems} autofocus />
		</div>
		<div class="field">type</div>
		<div class="field-edit">
			<Combobox name="type" bind:value={selectedType} items={typeItems} />
		</div>
		<label class="field" for="piece-title">title</label>
		<div class="field-edit">
			<input id="piece-title" type="text" name="name" class="input" required bind:value={name} />
		</div>
		<div class="actions">
			<Button type="submit">Create</Button>
			<a href="/admin"><Button variant="outline">Cancel</Button></a>
		</div>
	</form>
</section>

<style>
	.field {
		display: block;
		font-size: 80%;
		padding-bottom: var(--space-1);
	}
	.field-edit {
		padding-bottom: var(--space-3);
	}
	.input {
		width: 100%;
	}
	section.create {
		margin: var(--space-4) auto var(--space-8);
		width: 85%;
	}
	.actions {
		display: flex;
		justify-content: space-between;
		gap: var(--space-2);
	}
	@media screen and (min-width: 768px) {
		section.create {
			width: clamp(500px, 66.6666%, 1000px);
		}
	}
	.banner {
		padding: var(--space-3);
		margin-bottom: var(--space-3);
		border-radius: var(--radius-small);
		font-size: 0.875rem;
	}
	.error-banner {
		background-color: var(--color-error-container);
		color: var(--color-on-error-container);
		border: 1px solid var(--color-error);
	}
</style>
