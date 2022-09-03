import Color from 'color'

// colors generated using builder from:
// https://material-foundation.github.io/material-theme-builder

export const Modes = {
  light: 'light',
  dark: 'dark',
} as const

export type Mode = keyof typeof Modes
export type ModeColors = {
  primary: string
  secondary: string
  tertiary: string
  error: string
  outline: string
  background: string
  surface: string
  surfaceInverse: string
  surfaceVariant: string
  shadowLight: string
  shadowMedium: string
  shadowHeavy: string
  onPrimary: string
  onSecondary: string
  onTertiary: string
  onError: string
  onBackground: string
  onSurface: string
  onSurfaceInverse: string
  onSurfaceVariant: string
  primaryContainer: string
  secondaryContainer: string
  tertiaryContainer: string
  errorContainer: string
  onPrimaryContainer: string
  onSecondaryContainer: string
  onTertiaryContainer: string
  onErrorContainer: string
}

// https://material-foundation.github.io/material-theme-builder

const primaryLight = Color('#715c00')
const onPrimaryLight = Color('#ffffff')
const primaryContainerLight = Color('#ffe179')
const onPrimaryContainerLight = Color('#231b00')
const secondaryLight = Color('#9f4200')
const onSecondaryLight = Color('#ffffff')
const secondaryContainerLight = Color('#ffdbcb')
const onSecondaryContainerLight = Color('#341100')
const tertiaryLight = Color('#006c46')
const onTertiaryLight = Color('#ffffff')
const tertiaryContainerLight = Color('#8ff7c0')
const onTertiaryContainerLight = Color('#002112')
const errorLight = Color('#ba1a1a')
const onErrorLight = Color('#ffffff')
const errorContainerLight = Color('#ffdad6')
const onErrorContainerLight = Color('#410002')
const outlineLight = Color('#7d7767')
const backgroundLight = Color('#fffbff')
const onBackgroundLight = Color('#231b00')
const surfaceLight = Color('#fffbff')
const onSurfaceLight = Color('#231b00')
const surfaceVariantLight = Color('#eae2cf')
const onSurfaceVariantLight = Color('#4b4639')
const surfaceInverseLight = Color('#3c2f00')
const onSurfaceInverseLight = Color('#fff0ca')
const primaryDark = Color('#e5c449')
const onPrimaryDark = Color('#3b2f00')
const primaryContainerDark = Color('#554500')
const onPrimaryContainerDark = Color('#ffe179')
const secondaryDark = Color('#ffb692')
const onSecondaryDark = Color('#552000')
const secondaryContainerDark = Color('#793100')
const onSecondaryContainerDark = Color('#ffdbcb')
const tertiaryDark = Color('#72daa5')
const onTertiaryDark = Color('#003822')
const tertiaryContainerDark = Color('#005234')
const onTertiaryContainerDark = Color('#8ff7c0')
const errorDark = Color('#ffb4ab')
const onErrorDark = Color('#690005')
const errorContainerDark = Color('#93000a')
const onErrorContainerDark = Color('#ffdad6')
const outlineDark = Color('#979080')
const backgroundDark = Color('#231b00')
const onBackgroundDark = Color('#faecaf')
const surfaceDark = Color('#231b00')
const onSurfaceDark = Color('#ffe084')
const surfaceVariantDark = Color('#4b4639')
const onSurfaceVariantDark = Color('#cec6b4')
const surfaceInverseDark = Color('#ffe084')
const onSurfaceInverseDark = Color('#231b00')

export type Colors = {
  [Modes.light]: ModeColors
  [Modes.dark]: ModeColors
}

export const colors: Colors = {
  [Modes.light]: {
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
  [Modes.dark]: {
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
}
