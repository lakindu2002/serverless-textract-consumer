/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  rewrites: async () => ([
    {
      source: '/api/:slug*',
      destination: 'https://api-analyzer.lakinduhewawasam.com/:slug*'
    }
  ])
}

module.exports = nextConfig
