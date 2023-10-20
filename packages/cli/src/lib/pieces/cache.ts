import { PieceSelectable } from '@luzzle/kysely'

export type PieceCache<T extends PieceSelectable> = ToJsonCompatible<
	Pick<T, NonNullableKeys<T>> & Partial<UnNullify<Pick<T, NullableKeys<T>>>>
>
