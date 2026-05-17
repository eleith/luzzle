import { bundledLanguagesInfo } from 'shiki'

const extToLang = new Map<string, string>()
for (const lang of bundledLanguagesInfo) {
	extToLang.set(lang.id, lang.id)
	for (const alias of lang.aliases ?? []) {
		extToLang.set(alias, lang.id)
	}
}
extToLang.set('txt', 'text')
extToLang.set('text', 'text')

export function getLang(filename: string): string | null {
	const basename = filename.toLowerCase().split('/').pop() as string
	const parts = basename.split('.')

	if (parts.length === 1) {
		return extToLang.get(parts[0]) ?? null
	}

	const last = parts[parts.length - 1]
	const lastLang = extToLang.get(last)
	if (lastLang) return lastLang

	const prev = parts[parts.length - 2]
	const prevLang = prev ? extToLang.get(prev) : undefined
	return prevLang ?? null
}
