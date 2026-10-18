import metadata from 'virtual:template-compatibility';

function freeze(value) {
	for (const child of Object.values(value)) {
		if (child && typeof child === 'object') freeze(child);
	}
	return Object.freeze(value);
}

export const compatibility = freeze(metadata);

function equal(left, right) {
	if (left === right) return true;
	if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
	if (Array.isArray(left) !== Array.isArray(right)) return false;
	const keys = Object.keys(left);
	return (
		keys.length === Object.keys(right).length &&
		keys.every((key) => Object.hasOwn(right, key) && equal(left[key], right[key]))
	);
}

// Validate parsed, inert metadata BEFORE importing any prepared JavaScript.
export function assertCompatible(candidate) {
	if (!equal(compatibility, candidate)) {
		throw new Error('Incompatible prepared template runtime/compiler metadata');
	}
}
