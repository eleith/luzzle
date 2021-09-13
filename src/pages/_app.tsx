import { AppProps } from 'next/app'
import '@app/public/styles/reboot.css'
import { ThemeProvider } from 'theme-ui'
import theme from '@app/lib/ui/theme'

export default function MyApp({ Component, pageProps }: AppProps): JSX.Element {
  return (
    <ThemeProvider theme={theme}>
      <Component {...pageProps} />
    </ThemeProvider>
  )
}
