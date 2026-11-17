import type { Component } from 'svelte';
import type { PublicWebPiece, PieceComponentHelpers } from '@luzzle/web.pieces';
import type { Static } from '@sinclair/typebox';
import type { IconDefinition } from './schema.js';

export type IconProps<Fields> = {
	piece: PublicWebPiece;
	fields: Fields;
	helpers: PieceComponentHelpers;
	size: { width: number; height?: number };
	lazy?: boolean;
	active?: boolean;
};

// Preserve each template's field contract without importing the component catalog.
type ComponentFor<Definition extends IconDefinition> = Definition extends IconDefinition
	? Component<IconProps<Static<Definition['fields']>>>
	: never;

export type IconComponent = ComponentFor<IconDefinition>;
