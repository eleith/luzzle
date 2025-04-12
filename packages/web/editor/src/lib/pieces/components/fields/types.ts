import { type PieceFrontmatterSchemaField } from '@luzzle/cli'

type AssetField = PieceFrontmatterSchemaField &
	({ format: 'asset' } | { type: 'array'; items: { type: 'asset' } })

type EnumField = PieceFrontmatterSchemaField &
	({ enum: string[] | number[] } | { type: 'array'; items: { enum: string[] | number[] } })

export { type AssetField, type EnumField }
