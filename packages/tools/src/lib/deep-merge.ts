export function deepMerge<T extends object, U extends object>(target: T, source: U): T & U {
	const output = { ...target } as T & U

	for (const key in source) {
		if (Object.prototype.hasOwnProperty.call(source, key)) {
			const targetValue = output[key as keyof (T & U)]
			const sourceValue = source[key as keyof U]

			if (
				sourceValue instanceof Object &&
				!Array.isArray(sourceValue) &&
				targetValue instanceof Object &&
				!Array.isArray(targetValue)
			) {
				output[key as keyof (T & U)] = deepMerge(
					targetValue as object,
					sourceValue as object
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
				) as any
			} else if (Array.isArray(sourceValue) && Array.isArray(targetValue)) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				output[key as keyof (T & U)] = [...targetValue, ...sourceValue] as any
			} else {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				output[key as keyof (T & U)] = sourceValue as any
			}
		}
	}
	return output
}
