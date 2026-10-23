import type { PublicWebPiece } from '@luzzle/web.pieces';
import type { FieldMappings } from '@luzzle/web.config/mapping';
import type { Static, TObject } from '@sinclair/typebox';
import type { TemplateConfig } from '../config/index.js';
import { mapTemplateFields, TemplateFieldsError } from '../mapping.js';
import { schema as icon } from '../icons/default/schema.js';
import { schema as page } from '../pages/default/schema.js';
import { schema as opengraph } from '../opengraphs/default/schema.js';

type PieceConfig = TemplateConfig['pieces'][number];
type Role = 'icon' | 'page' | 'opengraph';

export interface TemplateData<Fields> {
	name: string;
	fields: Fields;
}

export interface PieceTemplateData {
	icon: TemplateData<Static<typeof icon.fields>>;
	page: TemplateData<Static<typeof page.fields>>;
	opengraph: TemplateData<Static<typeof opengraph.fields>>;
}

export type TemplatedPiece = PublicWebPiece & { templates: PieceTemplateData };

function mapRole<Schema extends TObject>(
	role: Role,
	definition: { name: string; fields: Schema },
	piece: PublicWebPiece,
	config?: PieceConfig
): TemplateData<Static<Schema>> {
	const selection = config?.templates?.[role];
	if (selection?.name && selection.name !== definition.name) {
		throw new Error(`Unknown ${role} template: ${selection.name}`);
	}
	const mapping: FieldMappings = selection?.mapping ?? {};
	try {
		return {
			name: definition.name,
			fields: mapTemplateFields(definition.fields, piece.metadata, mapping)
		};
	} catch (error) {
		if (!(error instanceof TemplateFieldsError)) throw error;
		console.warn(
			`Invalid ${role} template fields for ${piece.type}/${piece.slug}: ${error.message}`
		);
		return { name: definition.name, fields: mapTemplateFields(definition.fields, {}, {}) };
	}
}

/** Worker OG rendering does not evaluate icon/page bindings. */
export function mapOpengraphTemplate(
	piece: PublicWebPiece,
	config?: PieceConfig
): PieceTemplateData['opengraph'] {
	return mapRole('opengraph', opengraph, piece, config);
}

/** Keep config/selector expressions on the server; clients receive only public field values. */
export function mapPieceTemplates(piece: PublicWebPiece, config?: PieceConfig): TemplatedPiece {
	return {
		...piece,
		templates: {
			icon: mapRole('icon', icon, piece, config),
			page: mapRole('page', page, piece, config),
			opengraph: mapOpengraphTemplate(piece, config)
		}
	};
}
