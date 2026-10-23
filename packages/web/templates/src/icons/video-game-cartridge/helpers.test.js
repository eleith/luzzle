import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getCartridgeFit } from './helpers.js';

test('the entire cartridge artwork fits a short allocated height', () => {
	const layout = getCartridgeFit(80, 55);
	assert.ok(layout.scale > 0 && layout.scale < 1);
	assert.ok(layout.width <= 80);
	assert.ok(layout.height <= 55 + Number.EPSILON * 55);
	assert.equal(
		layout.height,
		(80 * 1.25 * 0.02 + 80 * 1.25 * 0.12 + 80 * 0.74 + 80 * 0.1 + 16) * layout.scale
	);
});

test('roomy allocations preserve production dimensions without upscaling', () => {
	const layout = getCartridgeFit(125, 200);
	assert.equal(layout.scale, 1);
	assert.equal(layout.width, 125);
	assert.equal(layout.height, 142.875);
	assert.equal(getCartridgeFit(80, 0).scale, 0);
});
