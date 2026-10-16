<script lang="ts">
	import '$lib/pieces/viewer/ViewerBar.css'
	import { onMount, onDestroy } from 'svelte'
	import { page } from '$app/state'
	import type { LayoutProps } from './$types'

	import ArrowLeftIcon from 'virtual:icons/ph/arrow-left'
	import PieceOverview from '$lib/pieces/viewer/PieceOverview.svelte'
	import PreviewFacts from './PreviewFacts.svelte'
	import PreviewLogs from './PreviewLogs.svelte'

	let { data, children }: LayoutProps = $props()

	type PreviewStatus = 'enqueued' | 'running' | 'completed' | 'failed' | 'expired'

	type PhaseProgress = {
		phase: string
		status: string
		started_at: number
		finished_at: number | null
		message: string | null
	}
	type PhaseLog = {
		job_id: string
		phase: string
		line_number: number
		ts: number
		level: string
		message: string
	}

	let status = $state<PreviewStatus>(
		data.status === 'waiting' ? 'enqueued' : data.status === 'expired' ? 'expired' : data.status
	)
	let errorMessage = $state(data.errorMessage ?? '')

	const initialPhases = data.phases ?? []
	const initialLogs: Record<string, PhaseLog[]> = {}
	if (data.logs) {
		for (const log of data.logs) {
			if (!initialLogs[log.phase]) initialLogs[log.phase] = []
			initialLogs[log.phase].push(log)
		}
	}

	let phases = $state<PhaseProgress[]>(initialPhases)
	let logs = $state<Record<string, PhaseLog[]>>(initialLogs)

	let eventSource: EventSource | null = null

	const editorUrl = `/admin/piece/${data.file}/source`

	const logsUrl = `/admin/piece/${data.file}/preview/${data.job}`
	const pageUrl = `/admin/piece/${data.file}/preview/${data.job}/page`
	const iconUrl = `/admin/piece/${data.file}/preview/${data.job}/icon`
	const ogUrl = `/admin/piece/${data.file}/preview/${data.job}/og`

	function startWatching() {
		if (eventSource) eventSource.close()
		eventSource = new EventSource(`/api/admin/preview/${data.job}/stream`)

		eventSource.addEventListener('state', (e) => {
			const d = JSON.parse(e.data)
			if (d.state === 'running' || d.state === 'claimed') {
				status = 'running'
			} else if (d.state === 'waiting') {
				status = 'enqueued'
			}
		})

		eventSource.addEventListener('phase', (e) => {
			phases = JSON.parse(e.data)
		})

		eventSource.addEventListener('log', (e) => {
			const newLogs: PhaseLog[] = JSON.parse(e.data)
			const updated = { ...logs }
			for (const log of newLogs) {
				if (!updated[log.phase]) {
					updated[log.phase] = []
				}
				updated[log.phase] = [...updated[log.phase], log]
			}
			logs = updated
		})

		eventSource.addEventListener('done', (e) => {
			const d = JSON.parse(e.data)
			if (d.state === 'completed') {
				window.location.reload()
			} else {
				status = 'failed'
				if (d.errors && d.errors.length > 0) {
					errorMessage = d.errors[0]?.message || 'Preview failed'
				}
			}
			eventSource?.close()
			eventSource = null
		})

		eventSource.addEventListener('error', () => {
			// stream error, let the next reconnect cycle handle it
		})
	}

	onMount(() => {
		if (data.status === 'running' || data.status === 'waiting') {
			startWatching()
		}
	})

	onDestroy(() => {
		if (eventSource) eventSource.close()
	})
</script>

<header class="viewer-bar">
	<a href={editorUrl} class="viewer-bar-back" aria-label="Back to editor" title="Back to editor">
		<ArrowLeftIcon aria-hidden="true" focusable="false" />
	</a>
	<nav class="viewer-bar-links" aria-label="Preview views">
		<a
			href={logsUrl}
			class="viewer-bar-link"
			class:active={page.url.pathname === logsUrl}
			aria-current={page.url.pathname === logsUrl ? 'page' : undefined}>overview</a
		>
		<a
			href={status === 'completed' ? pageUrl : '#'}
			class="viewer-bar-link"
			class:active={page.url.pathname === pageUrl}
			aria-current={page.url.pathname === pageUrl ? 'page' : undefined}
			class:disabled={status !== 'completed'}
			aria-disabled={status !== 'completed'}
		>
			page
		</a>
		<a
			href={status === 'completed' ? iconUrl : '#'}
			class="viewer-bar-link"
			class:active={page.url.pathname === iconUrl}
			aria-current={page.url.pathname === iconUrl ? 'page' : undefined}
			class:disabled={status !== 'completed'}
			aria-disabled={status !== 'completed'}
		>
			icon
		</a>
		<a
			href={status === 'completed' ? ogUrl : '#'}
			class="viewer-bar-link"
			class:active={page.url.pathname === ogUrl && !page.url.searchParams.has('html')}
			aria-current={page.url.pathname === ogUrl && !page.url.searchParams.has('html')
				? 'page'
				: undefined}
			class:disabled={status !== 'completed'}
			aria-disabled={status !== 'completed'}
		>
			share
		</a>
		{#if status === 'completed' && page.url.pathname === ogUrl && page.url.searchParams.has('html')}
			<a href="{ogUrl}?html" class="viewer-bar-link active" aria-current="page">share (html)</a>
		{/if}
	</nav>
	<span class="viewer-bar-label">preview</span>
</header>

{#if status === 'completed'}
	<main id="main-content">
		{@render children()}
	</main>
{:else}
	<main id="main-content">
		<PieceOverview title="Preview" fileUrl={() => undefined}>
			<PreviewFacts
				file={data.file}
				{phases}
				{status}
				createdAt={data.createdAt}
				finishedAt={data.finishedAt}
			/>
			<PreviewLogs {status} {phases} {logs} {errorMessage} />
		</PieceOverview>
	</main>
{/if}
