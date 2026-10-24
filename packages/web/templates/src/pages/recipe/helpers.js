/** @param {{ totalMinutes?: number; prepMinutes?: number; cookMinutes?: number }} fields */
export function getTotalMinutes(fields) {
	if (fields.totalMinutes !== undefined) return fields.totalMinutes;
	if (fields.prepMinutes === undefined && fields.cookMinutes === undefined) return undefined;
	return (fields.prepMinutes ?? 0) + (fields.cookMinutes ?? 0);
}
