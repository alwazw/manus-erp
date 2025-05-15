/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://8000-ihjhzgiap650vxkp9bt03-998d4a31.manus.computer/api/:path*', // Proxy to Public Backend URL
      },
    ];
  },
};

module.exports = nextConfig;

