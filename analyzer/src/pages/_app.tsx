import { Amplify } from 'aws-amplify';
import { ThemeProvider, createTheme } from '@mui/material'
import type { AppProps } from 'next/app'
import { Fragment } from 'react'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css';

export const amplifyConfig = {
  Auth: {
    identityPoolId: process.env.NEXT_PUBLIC_AWS_IDENTITY_POOL_ID,
    region: process.env.NEXT_PUBLIC_AWS_PROJECT_REGION,
    userPoolId: process.env.NEXT_PUBLIC_AWS_USER_POOL_ID,
    userPoolWebClientId: process.env.NEXT_PUBLIC_AWS_USER_CLIENT_ID,
  },
  Storage: {
    AWSS3: {
      bucket: process.env.NEXT_PUBLIC_AWS_S3_BUCKET,
      region: process.env.NEXT_PUBLIC_AWS_PROJECT_REGION
    },
  }
};

Amplify.configure(amplifyConfig);

export default function App({ Component, pageProps }: AppProps) {

  return <ThemeProvider
    theme={createTheme()}
  >
    <Fragment>
      <Component {...pageProps} />
      <ToastContainer />
    </Fragment>
  </ThemeProvider>
}
