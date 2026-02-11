export {}

declare global {
	function $props<T = unknown>(): T
	function $state<T = unknown>(value: T): T
	function $derived<T = unknown>(value: T): T
	function $effect(fn: () => void | (() => void)): void
}
