import { style, globalStyle, CSSProperties } from '@vanilla-extract/css'
import { vars } from './vars.css'
import { ImportantCSS } from '../types'

function withImportant(css: ImportantCSS<CSSProperties>): CSSProperties {
  return css as CSSProperties
}

export const base = style({
  // Prevent padding and border from affecting element width
  boxSizing: 'border-box',

  // Remove margin and padding in all browsers
  margin: 0,
  padding: 0,

  // Allow adding border to element by just adding borderWidth
  borderColor: vars.colors.onBackground,
  borderStyle: vars.borderStyles.solid,
  borderWidth: 0,

  color: 'current',
  fontSize: '100%',
  fontFamily: vars.fonts.sans,
  verticalAlign: 'baseline',
  selectors: {
    [`&:focus`]: {
      outline: 'none',
    },
  },
})

// HTML5 display-role reset for older browsers
const block = style({
  display: 'block',
})

const body = style({
  lineHeight: vars.lineHeights.none,
})

const list = style({
  listStyle: 'none',
})

const quote = style({
  quotes: 'none',
  selectors: {
    '&:before, &:after': {
      content: "''",
    },
  },
})

const table = style({
  borderCollapse: 'collapse',
  borderSpacing: 0,
})

const appearance = style({
  appearance: 'none',
})

const field = style([
  block,
  appearance,
  style({
    outline: 'none',
    '::placeholder': {
      color: vars.colors.background,
      opacity: vars.opacity['100'],
    },
  }),
])

// Custom reset rules
const mark = style({
  backgroundColor: 'transparent',
  color: 'inherit',
})

const select = style([
  field,
  style({
    selectors: {
      '&::-ms-expand': {
        display: 'none',
      },
    },
  }),
])

const input = style([
  field,
  style({
    selectors: {
      // Hide browser increment/decrement buttons
      '&::-webkit-outer-spin-button': {
        WebkitAppearance: 'none',
      },
      '&::-webkit-inner-spin-button': {
        WebkitAppearance: 'none',
      },
      // Hide browser clear input button
      '&::-ms-clear': {
        display: 'none',
      },
      '&::-webkit-search-cancel-button': {
        WebkitAppearance: 'none',
      },
    },
  }),
])

const button = style({
  background: 'none',
})

const a = style({
  textDecoration: 'none',
  color: 'inherit',
})

export const element = {
  article: block,
  aside: block,
  details: block,
  div: block,
  figcaption: block,
  figure: block,
  footer: block,
  header: block,
  hgroup: block,
  menu: block,
  nav: block,
  section: block,
  ul: list,
  ol: list,
  blockquote: quote,
  q: quote,
  body,
  a,
  table,
  mark,
  select,
  button,
  textarea: field,
  input,
}

export type Element = keyof typeof element

/*
 * base from https://www.joshwcomeau.com/css/custom-css-reset/
 */

/*
 * Use a more-intuitive box-sizing model.
 */
globalStyle('*, *::before, *::after', {
  boxSizing: 'border-box',
  '@media': {
    '(prefers-reduced-motion: reduce)': withImportant({
      animationDuration: '0.01ms !important',
      animationIterationCount: '1 !important',
      transitionDuration: '0.01ms !important',
      scrollBehavior: 'auto !important',
    }),
  },
})

/*
 * Remove default margin
 */
globalStyle('*', {
  margin: 0,
})

/*
 * Allow percentage-based heights in the application
 */
globalStyle('html, body', {
  height: '100%',
  background: vars.colors.background,
  color: vars.colors.onBackground,
})

/*
 * Typographic tweaks!
 * Add accessible line-height
 * Improve text rendering
 */
globalStyle('body', {
  lineHeight: 1.5,
  WebkitFontSmoothing: 'antialiased',
})

/*
 * Improve media defaults
 */
globalStyle('img, picture, video, canvas, svg', {
  display: 'block',
  maxWidth: '100%',
})

/*
 * Remove built-in form typography styles
 */
globalStyle('input, button, textarea, select', {
  font: 'inherit',
})

/*
 * Avoid text overflows
 */
globalStyle('p, h1, h2, h3, h4, h5, h6', {
  overflowWrap: 'break-word',
})

/*
 * Create a root stacking context
 */
globalStyle('#root, #__next', {
  isolation: 'isolate',
})

globalStyle('html:focus-within', {
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      scrollBehavior: 'auto',
    },
  },
})

globalStyle(':root', {
  vars: {
    '--mdc-theme-primary': vars.colors.primary,
    '--mdc-theme-primary-bg': vars.colors.primaryContainer,
    '--mdc-theme-on-primary': vars.colors.onPrimary,
    '--mdc-theme-secondary': vars.colors.secondary,
    '--mdc-theme-secondary-bg': vars.colors.secondaryContainer,
    '--mdc-theme-on-secondary': vars.colors.onSecondary,
    '--mdc-theme-surface': vars.colors.surface,
    '--mdc-theme-on-surface': vars.colors.onSurface,
    '--mdc-theme-background': vars.colors.background,
  },
})
