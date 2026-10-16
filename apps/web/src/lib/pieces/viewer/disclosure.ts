import type { OutputValue } from './assets'

/** Toggle one projected row identity without changing other open rows or the input set. */
export function toggleDisclosure(
	expanded: ReadonlySet<OutputValue>,
	value: OutputValue
): Set<OutputValue> {
	const next = new Set(expanded)
	if (next.has(value)) next.delete(value)
	else next.add(value)
	return next
}
