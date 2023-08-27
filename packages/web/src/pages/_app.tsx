import { AppProps } from 'next/dist/shared/lib/router/router'
import { ThemeProvider } from 'next-themes'
import { NotificationProvider, NotificationList } from '@luzzle/ui/components'
import { Themes } from '@app/common/components/layout/Page.css'

export default function MyApp({ Component, pageProps }: AppProps): JSX.Element {
	return (
		<ThemeProvider
			disableTransitionOnChange
			value={{ light: Themes.light, dark: Themes.dark }}
			defaultTheme="system"
		>
			<NotificationProvider>
				<Component {...pageProps} />
				<NotificationList />
			</NotificationProvider>
		</ThemeProvider>
	)
}
