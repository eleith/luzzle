import type { Component } from 'svelte';
import type { PublicWebPiece, PieceComponentHelpers } from '@luzzle/web.pieces';
import type { Static } from '@sinclair/typebox';
import type { OpengraphDefinition } from './schema.js';

export type OpengraphProps<Fields> = {
	piece: PublicWebPiece;
	fields: Fields;
	helpers: PieceComponentHelpers;
};

// Preserve each template's field contract without importing the component catalog.
type ComponentFor<Definition extends OpengraphDefinition> = Definition extends OpengraphDefinition
	? Component<OpengraphProps<Static<Definition['fields']>>>
	: never;

export type OpengraphComponent = ComponentFor<OpengraphDefinition>;
