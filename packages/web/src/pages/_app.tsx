import { AppProps } from 'next/dist/shared/lib/router/router'
import { ThemeProvider } from 'next-themes'
import { Modes } from '@luzzle/ui/tokens'
import { NotificationProvider, NotificationList } from '@luzzle/ui/components'

export default function MyApp({ Component, pageProps }: AppProps): JSX.Element {
  return (
    <ThemeProvider
      disableTransitionOnChange
      value={{ light: Modes.light, dark: Modes.dark }}
      defaultTheme="system"
    >
      <NotificationProvider>
        <Component {...pageProps} />
        <NotificationList />
      </NotificationProvider>
    </ThemeProvider>
  )
}
