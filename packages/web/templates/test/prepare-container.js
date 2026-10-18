import assert from 'node:assert/strict';
import path from 'node:path';
import { rename, rm } from 'node:fs/promises';
import { prepareIsolatedFixture } from './support/prepare-isolated.js';

if (!process.argv[2])
	throw new Error('Usage: node test/prepare-container.js <empty-output-directory>');
const proof = await prepareIsolatedFixture(process.argv[2]);
assert.equal(proof.packageDirectory, path.join(proof.root, 'node_modules/@luzzle/web.templates'));
// The final Docker stage supplies a real pnpm production deployment instead.
await rm(path.join(proof.root, 'node_modules'), { recursive: true });
await rename(proof.entry, path.join(proof.root, 'check.mjs'));
