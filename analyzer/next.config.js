/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  rewrites: async () => ([
    {
      source: '/api/:slug*',
      destination: 'https://30yfalthwf.execute-api.us-east-1.amazonaws.com/stage/:slug*'
    },
    {
      source: '/asset/:slug*',
      destination: 'https://dt6yuo8uylpey.cloudfront.net/public/analyze/:slug*'
    }
  ])
}

module.exports = nextConfig
