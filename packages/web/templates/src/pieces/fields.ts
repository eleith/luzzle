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

function mapRole<Schema extends TObject>(
	role: Role,
	fields: Schema,
	piece: PublicWebPiece,
	config?: PieceConfig
): TemplateData<Static<Schema>> {
	const mapping = fallbackMapping(config?.templates?.[role], fields);
	try {
		return {
			name: 'default',
			fields: mapTemplateFields(fields, piece.metadata, mapping)
		};
	} catch (error) {
		if (!(error instanceof TemplateFieldsError)) throw error;
		console.warn(
			`Invalid ${role} template fields for ${piece.type}/${piece.slug}: ${error.message}`
		);
		return { name: 'default', fields: mapTemplateFields(fields, {}, {}) };
	}
}

function fallbackMapping(
	selection: { file?: string; mapping?: FieldMappings } | undefined,
	fields: TObject
): FieldMappings | undefined {
	// The built-in fallback must not evaluate bindings used only by the local file.
	if (!selection?.file || !selection.mapping) return selection?.mapping;
	return Object.fromEntries(
		Object.entries(selection.mapping).filter(([key]) => Object.hasOwn(fields.properties, key))
	);
}

/** Worker OG rendering does not evaluate icon/page bindings. */
export function mapOpengraphTemplate(
	piece: PublicWebPiece,
	config?: PieceConfig
): PieceTemplateData['opengraph'] {
	return mapRole('opengraph', opengraph.fields, piece, config);
}

/** Keep config/selector expressions on the server; clients receive only public field values. */
export function mapPieceTemplates(piece: PublicWebPiece, config?: PieceConfig): TemplatedPiece {
	return {
		...piece,
		templates: {
			icon: mapRole('icon', icon.fields, piece, config),
			page: mapRole('page', page.fields, piece, config),
			opengraph: mapOpengraphTemplate(piece, config)
		}
	};
}
