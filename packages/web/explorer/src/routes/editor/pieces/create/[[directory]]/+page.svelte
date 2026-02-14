<script lang="ts">
	import { goto } from '$app/navigation'
	import Button from '$lib/components/ui/Button.svelte'

	let { data, form } = $props()
	let editSlug: HTMLInputElement | null = $state(null)
	let selectedType = $state(data.type)

	$effect(() => {
		if (editSlug) {
			editSlug.focus()
			editSlug.select()
		}
	})

	function onTypeChange() {
		const url = new URL(window.location.href)
		url.searchParams.set('type', selectedType)
		goto(url.toString())
	}
</script>

<section class="create">
	<form method="post" enctype="multipart/form-data" action="?/create">
		<div class="piece-container">
			{#if form?.error}
				<div class="error" style="color:var(--color-error); margin-bottom: var(--space-4);">
					{form.error.message}
				</div>
			{/if}
			<div class="field">directory</div>
			<div class="field-edit">
				{data.directory || '(root)'}
				<input type="hidden" name="directory" value={data.directory} />
			</div>
			<div class="field">type</div>
			<div class="field-edit">
				<select name="type" class="input" bind:value={selectedType} onchange={onTypeChange}>
					{#each data.types as type (type)}
						<option value={type}>{type}</option>
					{/each}
				</select>
			</div>
			<div class="field">filename</div>
			<div class="field-edit">
				<input
					type="text"
					name="name"
					class="input"
					value="new-{selectedType}"
					required
					bind:this={editSlug}
					style="width:100%;"
				/>
			</div>

			<div class="field">note</div>
			<div class="field-edit">
				<textarea class="input" name="note" style="width: 100%;height:300px;"></textarea>
			</div>

			<div style="display:flex;justify-content:space-between;">
				<Button type="submit">create</Button>
				<a href="/editor/directory/{data.directory}">
					<Button variant="outline">cancel</Button>
				</a>
			</div>
		</div>
	</form>
</section>

<style>
	div.field {
		font-size: 80%;
		padding-bottom: 5px;
	}

	div.field-edit {
		padding-bottom: 10px;
	}

	section.create {
		margin: var(--space-4);
		margin-bottom: var(--space-8);
		margin-left: auto;
		margin-right: auto;
		width: 85%;
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	@media screen and (min-width: 768px) {
		section.create {
			width: clamp(500px, 66.6666%, 1000px);
		}
	}
</style>
