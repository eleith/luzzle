import { stringify } from 'yaml'

function addFrontMatter(
	markdown?: string | null,
	metadata: { [key: string]: unknown } = {}
): string {
	const yamlString = stringify(metadata)
	const content = markdown?.trim() || ''

	return `---\n${yamlString}---\n${content}\n`
}

export { addFrontMatter }
