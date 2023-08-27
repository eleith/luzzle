declare global {
	namespace async {
		export function concatLimit<T, R, E = Error>(
			arr: IterableCollection<T>,
			limit: number,
			iterator: AsyncResultIterator<T, R[], E>
		): Promise<R[]>
	}
}

export {}
