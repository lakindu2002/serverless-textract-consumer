/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  rewrites: async () => ([
    {
      source: '/api/:slug*',
      destination: 'https://api-icitr.lakinduhewawasam.com/:slug*'
    },
    {
      source: '/asset/:slug*',
      destination: 'https://icitr.lakinduhewawasam.com/public/analyze/:slug*'
    }
  ])
}

module.exports = nextConfig
