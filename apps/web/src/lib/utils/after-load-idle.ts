/** Keep optional work behind page resources, then let the browser choose an idle slot. */
export function afterLoadIdle(callback: () => void): () => void {
	let cancelScheduled = () => {}

	function schedule() {
		if (typeof window.requestIdleCallback === 'function') {
			const id = window.requestIdleCallback(callback)
			cancelScheduled = () => window.cancelIdleCallback(id)
		} else {
			const id = window.setTimeout(callback, 0)
			cancelScheduled = () => window.clearTimeout(id)
		}
	}

	if (document.readyState === 'complete') schedule()
	else window.addEventListener('load', schedule, { once: true })

	return () => {
		window.removeEventListener('load', schedule)
		cancelScheduled()
	}
}
