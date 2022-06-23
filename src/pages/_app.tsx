import { AppProps } from 'next/dist/shared/lib/router/router'
import { ThemeProvider } from 'next-themes'
import { Modes } from '@app/common/ui/tokens'

export default function MyApp({ Component, pageProps }: AppProps): JSX.Element {
  return (
    <ThemeProvider
      disableTransitionOnChange
      value={{ light: Modes.light, dark: Modes.dark }}
      defaultTheme="system"
    >
      <Component {...pageProps} />
    </ThemeProvider>
  )
}
