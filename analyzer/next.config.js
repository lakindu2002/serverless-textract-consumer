/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  rewrites: async () => ([
    {
      source: '/api/:slug*',
      destination: 'https://api-analyzer.lakinduhewawasam.com/:slug*'
    },
    {
      source: '/asset/:slug*',
      destination: 'https://analyzer.lakinduhewawasam.com/public/analyze/:slug*'
    }
  ])
}

module.exports = nextConfig
