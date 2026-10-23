/**
 * @param {number} width
 * @returns {{ height: number; path: string }}
 */
export function getRecipeCutouts(width) {
	const scale = Math.round((width / 375) * 100) / 100;
	const radius = Math.round(10 * scale);
	const slotHeight = Math.round(8 * scale);
	const slotWidth = Math.round(7.5 * scale);
	const halfSlotWidth = slotWidth / 2;
	const height = 2 * radius + slotHeight;
	const cornerRadius = Math.round(12 * scale);
	const centers = [0.25, 0.5, 0.75].map((position) => Math.round(width * position));
	const intersectionY = Math.round(
		radius + Math.sqrt(radius * radius - halfSlotWidth * halfSlotWidth)
	);

	const path = [
		`M0,0 H${width} V${height - cornerRadius}`,
		`A${cornerRadius},${cornerRadius} 0 0,1 ${width - cornerRadius},${height}`,
		`H${cornerRadius} A${cornerRadius},${cornerRadius} 0 0,1 0,${height - cornerRadius} Z`,
		...centers.map((center) =>
			[
				`M${center - halfSlotWidth},${height}`,
				`V${intersectionY}`,
				`A${radius},${radius} 0 1,1 ${center + halfSlotWidth},${intersectionY}`,
				`V${height} Z`
			].join(' ')
		)
	].join(' ');

	return { height, path };
}
