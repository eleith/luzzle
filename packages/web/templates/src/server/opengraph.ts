import { resolve } from 'node:path';
import type { FieldMappings } from '@luzzle/web.config/mapping';
import {
	formatPieceDate,
	getTitleSizeRem,
	type PieceComponentHelpers,
	type PublicWebPiece
} from '@luzzle/web.pieces';
import { resolveTemplateFields } from '@luzzle/web.templates/mapping';
import type { OpengraphProps } from '../opengraphs/props.js';
import type { TemplateConfig } from '../config/index.js';
import type { createTemplateFileCache } from './file-cache.ts';

type TemplateCache = ReturnType<typeof createTemplateFileCache>;

export async function preloadAuthoredOpengraphFiles(
	caches: { published: TemplateCache; preview: TemplateCache },
	pieces: TemplateConfig['pieces']
) {
	for (const piece of Object.values(pieces)) {
		const selection = piece.templates?.opengraph;
		if (!selection || !('file' in selection)) continue;
		const filename = resolve(selection.file);
		await Promise.all([caches.published.load(filename), caches.preview.load(filename)]);
	}
}

/** Both browser previews and worker images render the same trusted local file on the server. */
export async function renderAuthoredOpengraph(
	cache: TemplateCache,
	selection: { file: string; mapping?: FieldMappings },
	piece: PublicWebPiece,
	helpers: PieceComponentHelpers
) {
	const fields = resolveTemplateFields(piece.metadata, selection.mapping);
	return renderOpengraphFile(cache, resolve(selection.file), piece, fields, helpers);
}

export async function renderOpengraphFile<Fields>(
	cache: TemplateCache,
	filename: string,
	piece: PublicWebPiece,
	fields: Fields,
	helpers: PieceComponentHelpers
) {
	const template = await cache.load(filename);
	const html = template.render({
		piece,
		fields,
		helpers: { ...helpers, formatPieceDate, getTitleSizeRem }
	} satisfies OpengraphProps<Fields>);
	return { html, css: template.css };
}
