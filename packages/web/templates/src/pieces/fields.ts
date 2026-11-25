import type { PublicWebPiece } from '@luzzle/web.pieces';
import type { FieldMappings } from '@luzzle/web.config/mapping';
import type { Static, TObject } from '@sinclair/typebox';
import type { TemplateConfig } from '../config/index.js';
import { mapTemplateFields, TemplateFieldsError } from '../mapping.js';
import { schema as icon, type Fields as IconFields } from '../icons/default/schema.js';
import { schema as page, type Fields as PageFields } from '../pages/default/schema.js';
import {
	schema as opengraph,
	type Fields as OpengraphFields
} from '../opengraphs/default/schema.js';

type PieceConfig = TemplateConfig['pieces'][string];
type Role = 'icon' | 'page' | 'opengraph';

export interface TemplateData<Fields> {
	name: 'default';
	fields: Fields;
}

export interface PieceTemplateData {
	icon: TemplateData<IconFields>;
	page: TemplateData<PageFields>;
	opengraph: TemplateData<OpengraphFields>;
}

export type TemplatedPiece = PublicWebPiece & { templates: PieceTemplateData };

function mapDefaultFields<Schema extends TObject>(
	role: Role,
	fieldSchema: Schema,
	piece: PublicWebPiece,
	config?: PieceConfig
): Static<Schema> {
	const mapping = fallbackMapping(config?.templates?.[role], fieldSchema);
	try {
		return mapTemplateFields(fieldSchema, piece.metadata, mapping);
	} catch (error) {
		if (!(error instanceof TemplateFieldsError)) throw error;
		console.warn(
			`Invalid default ${role} template fields for ${piece.type}/${piece.slug}: ${error.message}`
		);
		return mapTemplateFields(fieldSchema, {}, {});
	}
}

function fallbackMapping(
	selection: { file?: string; mapping?: FieldMappings } | undefined,
	fieldSchema: TObject
): FieldMappings | undefined {
	// The built-in fallback must not evaluate bindings used only by the local file.
	if (!selection?.file || !selection.mapping) return selection?.mapping;
	return Object.fromEntries(
		Object.entries(selection.mapping).filter(([key]) => Object.hasOwn(fieldSchema.properties, key))
	);
}

/** Worker OG rendering does not evaluate icon/page bindings. */
export function mapDefaultOpengraphFields(
	piece: PublicWebPiece,
	config?: PieceConfig
): OpengraphFields {
	return mapDefaultFields('opengraph', opengraph.fields, piece, config);
}

/** Keep config/selector expressions on the server; clients receive only public field values. */
export function attachDefaultTemplateData(
	piece: PublicWebPiece,
	config?: PieceConfig
): TemplatedPiece {
	return {
		...piece,
		templates: {
			icon: { name: 'default', fields: mapDefaultFields('icon', icon.fields, piece, config) },
			page: { name: 'default', fields: mapDefaultFields('page', page.fields, piece, config) },
			opengraph: { name: 'default', fields: mapDefaultOpengraphFields(piece, config) }
		}
	};
}
