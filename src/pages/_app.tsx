import { AppProps } from 'next/dist/shared/lib/router/router'
import { ThemeProvider } from 'next-themes'
import { darkTheme } from '@app/lib/ui/stitches.config'

import '@app/public/styles/reset.css'

export default function MyApp({ Component, pageProps }: AppProps): JSX.Element {
  return (
    <ThemeProvider
      disableTransitionOnChange
      attribute="class"
      value={{ light: 'light-theme', dark: darkTheme.className }}
      defaultTheme="system"
    >
      <Component {...pageProps} />
    </ThemeProvider>
  )
}
