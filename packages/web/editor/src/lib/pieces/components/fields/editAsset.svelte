<script lang="ts">
	import type { AssetField } from './types'

	type Props = {
		field: AssetField
		value: unknown
	}

	let { field, value }: Props = $props()

	const isArray = field.type === 'array'
	const values = value === undefined ? [] : isArray ? (value as string[]) : [value as string]

	const prefix = 'frontmatter'

	let toRemove = $state<string[]>([])
	let toUpload = $state<FileList | null>()
	let retainAssets = $state<string[]>(values)
	let fileInput = $state<HTMLInputElement>()

	function clickToRemove(asset: string) {
		const index = retainAssets.indexOf(asset)
		retainAssets.splice(index, 1)
		toRemove.push(asset)
	}

	function clickToRemoveUpload() {
		toUpload = undefined

		if (fileInput) {
			fileInput.value = ''
		}
	}

	function onChangeUpload() {
		const files = fileInput?.files

		if (files) {
			toUpload = files
		}
	}
</script>

<div>
	{#if retainAssets.length > 0}
		{#each retainAssets as asset}
			<div>
				<span><a href="/asset/{asset}" target="_blank">{asset}</a></span>
				<button onclick={() => clickToRemove(asset)}>remove</button>
			</div>
		{/each}
	{/if}

	{#if isArray || retainAssets.length === 0}
		<div>
			<input
				type="file"
				multiple={isArray}
				bind:this={fileInput}
				bind:files={toUpload}
				onchange={onChangeUpload}
				name="{prefix}.upload.{field.name}"
				required={!field.nullable}
			/>
			{#if toUpload?.length}
				<button onclick={() => clickToRemoveUpload()}>cancel</button>
			{/if}
		</div>
	{/if}

	{#each toRemove as asset}
		<input type="hidden" name="{prefix}.remove.{field.name}" value={asset} />
	{/each}
</div>

<style>
</style>
