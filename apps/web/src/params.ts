import { defineParams } from '@sveltejs/kit/params'

function matchFeedFormat(param: string): param is 'json' | 'xml' | 'md' {
	return /(json|xml|md)/.test(param)
}

function matchOpenGraphFormat(param: string): param is 'svg' | 'png' {
	return /(svg|png)/.test(param)
}

function matchVariantFormat(param: string): param is 'jpg' | 'avif' | 'webp' | 'png' {
	return /(avif|jpg|webp|png)/.test(param)
}

export const params = defineParams({
	feedFormat: (param) => (matchFeedFormat(param) ? param : undefined),
	openGraphFormat: (param) => (matchOpenGraphFormat(param) ? param : undefined),
	variantFormat: (param) => (matchVariantFormat(param) ? param : undefined)
})
