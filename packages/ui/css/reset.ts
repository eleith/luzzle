import { globalStyle, CSSProperties } from '@vanilla-extract/css'
import { ImportantCSS } from '../types'

function withImportant(css: ImportantCSS<CSSProperties>): CSSProperties {
  return css as CSSProperties
}

export function reset() {
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
}
