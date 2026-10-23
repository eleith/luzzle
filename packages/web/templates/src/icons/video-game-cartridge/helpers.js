/**
 * @param {number} width
 * @param {number} height
 * @returns {{ scale: number; width: number; height: number }}
 */
export function getCartridgeFit(width, height) {
	const topHeight = width * 1.25 * 0.02;
	const headerHeight = width * 1.25 * 0.12;
	const labelHeight = width * 0.74;
	const arrowHeight = width * 0.1;
	const arrowMargins = 16;
	const naturalHeight = topHeight + headerHeight + labelHeight + arrowHeight + arrowMargins;
	const scale = Math.min(1, Math.max(0, height) / naturalHeight);
	return { scale, width: width * scale, height: naturalHeight * scale };
}
