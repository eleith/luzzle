export function deepMerge(target, source) {
	const output = { ...target }

	for (const key in source) {
		if (Object.prototype.hasOwnProperty.call(source, key)) {
			const targetValue = output[key]
			const sourceValue = source[key]

			if (
				sourceValue instanceof Object &&
				!Array.isArray(sourceValue) &&
				targetValue instanceof Object &&
				!Array.isArray(targetValue)
			) {
				output[key] = deepMerge(targetValue, sourceValue)
			} else {
				output[key] = sourceValue
			}
		}
	}
	return output
}
