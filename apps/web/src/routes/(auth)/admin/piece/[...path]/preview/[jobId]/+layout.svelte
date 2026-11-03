<script lang="ts">
	import '#lib/pieces/viewer/ViewerBar.css'
	import { onMount, onDestroy } from 'svelte'
	import { page } from '$app/state'
	import { resolve } from '$app/paths'
	import type { LayoutProps } from './$types'
	import { encodeArchivePath } from '#lib/pieces/navigation.js'
	import {
		mergePhaseLogs,
		type ProgressPhase,
		type JobProgressLog
	} from '#lib/components/progress.js'

	import ArrowLeftIcon from 'virtual:icons/ph/arrow-left'
	import PieceOverview from '#lib/pieces/viewer/PieceOverview.svelte'
	import PreviewFacts from './PreviewFacts.svelte'
	import PreviewLogs from './PreviewLogs.svelte'

	let { data, children }: LayoutProps = $props()

	type PreviewStatus = 'enqueued' | 'running' | 'completed' | 'failed' | 'expired'

	let status = $state<PreviewStatus>(
		data.status === 'waiting' ? 'enqueued' : data.status === 'expired' ? 'expired' : data.status
	)
	let errorMessage = $state(data.errorMessage ?? '')
	let streamDisconnected = $state(false)

	let phases = $state<ProgressPhase[]>(data.phases ?? [])
	let logs = $state(mergePhaseLogs({}, data.logs ?? []))

	let eventSource: EventSource | null = null

	const path = encodeArchivePath(data.file)
	const jobId = encodeURIComponent(data.job)
	const previewRoute = '/(auth)/admin/piece/[...path]/preview/[jobId]'
	const editorUrl = resolve('/(auth)/admin/piece/[...path]/source', { path })
	const logsUrl = resolve(previewRoute, { path, jobId })
	const pageUrl = resolve(`${previewRoute}/page`, { path, jobId })
	const iconUrl = resolve(`${previewRoute}/icon`, { path, jobId })
	const shareUrl = resolve(`${previewRoute}/share`, { path, jobId })

	function startWatching() {
		if (eventSource) eventSource.close()
		streamDisconnected = false
		eventSource = new EventSource(`/api/admin/preview/${encodeURIComponent(data.job)}/stream`)

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
			const newLogs: JobProgressLog[] = JSON.parse(e.data)
			logs = mergePhaseLogs(logs, newLogs)
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
			if (eventSource?.readyState === EventSource.CLOSED) streamDisconnected = true
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
			class:active={page.route.id === previewRoute}
			aria-current={page.route.id === previewRoute ? 'page' : undefined}>overview</a
		>
		<a
			href={status === 'completed' ? pageUrl : '#'}
			class="viewer-bar-link"
			class:active={page.route.id === `${previewRoute}/page`}
			aria-current={page.route.id === `${previewRoute}/page` ? 'page' : undefined}
			class:disabled={status !== 'completed'}
			aria-disabled={status !== 'completed'}
		>
			page
		</a>
		<a
			href={status === 'completed' ? iconUrl : '#'}
			class="viewer-bar-link"
			class:active={page.route.id === `${previewRoute}/icon`}
			aria-current={page.route.id === `${previewRoute}/icon` ? 'page' : undefined}
			class:disabled={status !== 'completed'}
			aria-disabled={status !== 'completed'}
		>
			icon
		</a>
		<a
			href={status === 'completed' ? shareUrl : '#'}
			class="viewer-bar-link"
			class:active={page.route.id === `${previewRoute}/share`}
			aria-current={page.route.id === `${previewRoute}/share` ? 'page' : undefined}
			class:disabled={status !== 'completed'}
			aria-disabled={status !== 'completed'}
		>
			share
		</a>
	</nav>
	<span class="viewer-bar-label">preview</span>
</header>

{#if status === 'completed'}
	{@render children()}
{:else}
	<main id="main-content">
		<PieceOverview title="Preview" fileUrl={() => undefined}>
			<PreviewFacts
				file={data.file}
				{phases}
				{status}
				{streamDisconnected}
				createdAt={data.createdAt}
				finishedAt={data.finishedAt}
			/>
			<PreviewLogs {status} {phases} {logs} {errorMessage} />
		</PieceOverview>
	</main>
{/if}
