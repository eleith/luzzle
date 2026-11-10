export function responsiveFly(node: HTMLElement, { duration = 300 } = {}) {
	if (node.ownerDocument.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches) {
		duration = 0
	}
	return {
		duration,
		css: (t: number) => `
			opacity: ${t};
			transform: translate(var(--fly-x, 0px), calc((1 - ${t}) * var(--fly-y-offset, 0px)));
		`
	}
}
