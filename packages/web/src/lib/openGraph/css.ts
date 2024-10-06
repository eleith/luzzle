/* eslint-disable @typescript-eslint/no-explicit-any */
import { type AST } from 'svelte/compiler'

export function extractStyles(cssAst: NonNullable<AST.Root['css']>) {
	const styles: Record<string, string> = {}
	if (Object.hasOwn(cssAst, 'children') && cssAst.children.length) {
		for (const { prelude, block } of cssAst.children) {
			if (
				prelude &&
				typeof prelude !== 'string' &&
				prelude.children &&
				prelude.children.length > 0
			) {
				for (const selector of prelude.children) {
					const classNames = selector.children
						.filter((node: any) => node.type === 'ClassSelector')
						.map((node: any) => node.name)
					for (const className of classNames) {
						styles[className] =
							block?.children
								.map((declaration: Record<string, any>) => {
									return `${declaration.property}: ${declaration.value}`
								})
								.join('; ') + ';'
					}
				}
			}
		}
	}
	return styles
}
