type DeepPartial<T> = {
	[P in keyof T]?: T[P] extends Array<infer I> ? Array<DeepPartial<I>> : DeepPartial<T[P]>
}

type RequiredKeys<T> = {
	[K in keyof T]-?: Record<string, unknown> extends Pick<T, K> ? never : K
}[keyof T]

type OptionalKeys<T> = {
	[K in keyof T]-?: Record<string, unknown> extends Pick<T, K> ? K : never
}[keyof T]

type NonNullableKeys<T> = {
	[K in keyof T]-?: null extends T[K] ? never : K
}[keyof T]

type NullableKeys<T> = {
	[K in keyof T]-?: T[K] extends NonNullable<T[K]> ? never : K
}[keyof T]

type Timestamp = string

type ToJsonCompatible<T> = T extends Date
	? Timestamp
	: T extends Array<infer Item>
	? Array<ToJsonCompatible<Item>>
	: T extends Record<string, unknown>
	? { [Key in keyof T]: ToJsonCompatible<T[Key]> }
	: T

type UnNullify<T> = {
	[key in keyof T]: null extends T[key] ? Exclude<T[key], null> : T[key]
}
