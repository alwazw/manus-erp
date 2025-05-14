/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://app:8000/api/:path*', // Proxy to Backend
      },
    ];
  },
};

module.exports = nextConfig;

