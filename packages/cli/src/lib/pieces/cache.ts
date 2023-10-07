import { PieceDatabase } from './piece.js'

export type PieceCache<T extends PieceDatabase> = ToJsonCompatible<
	Pick<T, NonNullableKeys<T>> & Partial<UnNullify<Pick<T, NullableKeys<T>>>>
>
