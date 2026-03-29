/**
 * Returns the line number of the closing `---` of YAML frontmatter.
 * -1 when no frontmatter exists, Infinity when the opening `---` is
 * unclosed (user is still typing) so filtering stays permissive.
 */
function getFrontmatterEndLine(text) {
	const lines = text.split("\n");
	if (lines[0]?.trimEnd() !== "---") return -1;
	for (let i = 1; i < lines.length; i++) {
		if (lines[i].trimEnd() === "---") return i;
	}
	return Infinity;
}

function shouldRespond(documentText, position) {
	const endLine = getFrontmatterEndLine(documentText);
	if (endLine < 0) return false;
	return position.line <= endLine;
}

const route = {
	name: "luzzle-lsp",
	command: "luzzle-lsp",
	args: ["--stdio"],
	shouldRespond,
};

export { route, getFrontmatterEndLine, shouldRespond };
