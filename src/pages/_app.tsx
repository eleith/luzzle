import { ThemeProvider } from 'theme-ui'
import theme from '@app/lib/ui/theme'
import { AppProps } from 'next/dist/shared/lib/router/router'

export default function MyApp({ Component, pageProps }: AppProps): JSX.Element {
  return (
    <ThemeProvider theme={theme}>
      <Component {...pageProps} />
    </ThemeProvider>
  )
}
