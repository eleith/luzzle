import { ThemeContract, initialize } from '@luzzle/ui'
import Color from 'color'

export const Themes = {
	light: 'light',
	dark: 'dark',
} as const

export type Theme = keyof typeof Themes

// https://github.com/morhetz/gruvbox

// light
const primaryLight = Color('#98971a')
const onPrimaryLight = Color('#282828')
const secondaryLight = Color('#79740e')
const onSecondaryLight = Color('#fbf1c7')
const tertiaryLight = Color('#d79921')
const onTertiaryLight = onPrimaryLight
const errorLight = Color('#cc241d')
const onErrorLight = onPrimaryLight

const primaryContainerLight = Color('#fbf1c7')
const onPrimaryContainerLight = onPrimaryLight
const secondaryContainerLight = Color('#af3a03')
const onSecondaryContainerLight = primaryContainerLight
const tertiaryContainerLight = Color('#d79921')
const onTertiaryContainerLight = onPrimaryLight
const errorContainerLight = Color('#9d0006')
const onErrorContainerLight = primaryContainerLight

const outlineLight = Color('#3c3836')
const backgroundLight = Color('#fbf1c7')
const onBackgroundLight = onPrimaryLight
const surfaceLight = outlineLight
const onSurfaceLight = backgroundLight
const surfaceVariantLight = Color('#ebdbb2')
const onSurfaceVariantLight = onPrimaryLight
const surfaceInverseLight = Color('#f3e5bc')
const onSurfaceInverseLight = onPrimaryLight

// dark
const primaryDark = Color('#fabd2f')
const onPrimaryDark = Color('#282828')
const secondaryDark = Color('#d79921')
const onSecondaryDark = Color('#fbf1c7')
const tertiaryDark = Color('#98971a')
const onTertiaryDark = onSecondaryDark
const errorDark = Color('#fb4934')
const onErrorDark = onPrimaryDark

const primaryContainerDark = Color('#282828')
const onPrimaryContainerDark = Color('#d79921')
const secondaryContainerDark = Color('#793100')
const onSecondaryContainerDark = Color('#ffdbcb')
const tertiaryContainerDark = Color('#98971a')
const onTertiaryContainerDark = onSecondaryDark
const errorContainerDark = Color('#93000a')
const onErrorContainerDark = onSecondaryDark

const outlineDark = Color('#a89984')
const backgroundDark = Color('#282828')
const onBackgroundDark = Color('#fbf1c7')
const surfaceDark = outlineDark
const onSurfaceDark = onBackgroundDark
const surfaceVariantDark = Color('#3c3836')
const onSurfaceVariantDark = onBackgroundDark
const surfaceInverseDark = Color('#d5c4a1')
const onSurfaceInverseDark = backgroundDark

const fontSizes: ThemeContract['fontSizes'] = {
	label: '0.875rem',
	caption: '1rem',
	body: '1.25rem',
	h3: '1.5rem',
	h2: '1.825rem',
	h1: '2rem',
	title: '3rem',
	mobileResponsiveFactor: '4/5',
	root: '18px',
}

const themeLight: ThemeContract = {
	colors: {
		primary: primaryLight.string(),
		secondary: secondaryLight.string(),
		tertiary: tertiaryLight.string(),
		error: errorLight.string(),
		outline: outlineLight.string(),
		background: backgroundLight.string(),
		surface: surfaceLight.string(),
		surfaceInverse: surfaceInverseLight.string(),
		surfaceVariant: surfaceVariantLight.string(),
		shadowLight: onBackgroundLight.alpha(0.14).string(),
		shadowMedium: onBackgroundLight.alpha(0.2).string(),
		shadowHeavy: onBackgroundLight.alpha(0.34).string(),
		onPrimary: onPrimaryLight.string(),
		onSecondary: onSecondaryLight.string(),
		onTertiary: onTertiaryLight.string(),
		onError: onErrorLight.string(),
		onBackground: onBackgroundLight.string(),
		onSurface: onSurfaceLight.string(),
		onSurfaceInverse: onSurfaceInverseLight.string(),
		onSurfaceVariant: onSurfaceVariantLight.string(),
		primaryContainer: primaryContainerLight.string(),
		secondaryContainer: secondaryContainerLight.string(),
		tertiaryContainer: tertiaryContainerLight.string(),
		errorContainer: errorContainerLight.string(),
		onPrimaryContainer: onPrimaryContainerLight.string(),
		onSecondaryContainer: onSecondaryContainerLight.string(),
		onTertiaryContainer: onTertiaryContainerLight.string(),
		onErrorContainer: onErrorContainerLight.string(),
	},
	shadows: {
		raised: `0px 3px 1px -2px ${onBackgroundLight
			.alpha(0.2)
			.string()}, 0px 2px 2px 0px ${onBackgroundLight
			.alpha(0.14)
			.string()}, 0px 1px 5px 0px rgba(0, 0, 0, 0.12)`,
	},
	fontSizes,
}

const themeDark: ThemeContract = {
	colors: {
		primary: primaryDark.string(),
		secondary: secondaryDark.string(),
		tertiary: tertiaryDark.string(),
		error: errorDark.string(),
		outline: outlineDark.string(),
		background: backgroundDark.string(),
		surface: surfaceDark.string(),
		surfaceInverse: surfaceInverseDark.string(),
		surfaceVariant: surfaceVariantDark.string(),
		shadowLight: onBackgroundDark.alpha(0.14).string(),
		shadowMedium: onBackgroundDark.alpha(0.2).string(),
		shadowHeavy: onBackgroundDark.alpha(0.34).string(),
		onPrimary: onPrimaryDark.string(),
		onSecondary: onSecondaryDark.string(),
		onTertiary: onTertiaryDark.string(),
		onError: onErrorDark.string(),
		onBackground: onBackgroundDark.string(),
		onSurface: onSurfaceDark.string(),
		onSurfaceInverse: onSurfaceInverseDark.string(),
		onSurfaceVariant: onSurfaceVariantDark.string(),
		primaryContainer: primaryContainerDark.string(),
		secondaryContainer: secondaryContainerDark.string(),
		tertiaryContainer: tertiaryContainerDark.string(),
		errorContainer: errorContainerDark.string(),
		onPrimaryContainer: onPrimaryContainerDark.string(),
		onSecondaryContainer: onSecondaryContainerDark.string(),
		onTertiaryContainer: onTertiaryContainerDark.string(),
		onErrorContainer: onErrorContainerDark.string(),
	},
	shadows: {
		raised: `0px 3px 1px -2px ${onBackgroundDark
			.alpha(0.2)
			.string()}, 0px 2px 2px 0px ${onBackgroundDark
			.alpha(0.14)
			.string()}, 0px 1px 5px 0px rgba(0, 0, 0, 0.12)`,
	},
	fontSizes,
}

initialize({
	[`[data-theme="${Themes.light}"]`]: themeLight,
	[`[data-theme="${Themes.dark}"]`]: themeDark,
})

export { themeLight, themeDark }
