const symbols = [
	'icon-shield',
	'icon-dice',
	'icon-trophy',
	'icon-moon',
	'icon-crown',
	'icon-sword',
	'icon-coins'
];

/**
 * @param {string} title
 * @returns {string}
 */
export function getCardSymbol(title) {
	const hash = [...title].reduce((sum, character) => sum + character.charCodeAt(0), 0);
	return symbols[hash % symbols.length];
}
