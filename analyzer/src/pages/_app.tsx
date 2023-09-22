import { ThemeProvider, createTheme } from '@mui/material'
import type { AppProps } from 'next/app'

export default function App({ Component, pageProps }: AppProps) {
  return <ThemeProvider
    theme={createTheme()}
  >
    <Component {...pageProps} />
  </ThemeProvider>
}
