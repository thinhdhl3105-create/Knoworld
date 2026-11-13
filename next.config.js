/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // v51: Knoworld Museum đã thay bằng My Home
  async redirects() {
    return [
      { source: '/museum', destination: '/home', permanent: false },
      { source: '/museum/:path*', destination: '/home', permanent: false },
    ];
  },
};
module.exports = nextConfig;
