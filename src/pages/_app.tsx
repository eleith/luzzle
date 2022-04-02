import { AppProps } from 'next/dist/shared/lib/router/router'

import '@app/public/styles/reset.css'

export default function MyApp({ Component, pageProps }: AppProps): JSX.Element {
  return <Component {...pageProps} />
}
