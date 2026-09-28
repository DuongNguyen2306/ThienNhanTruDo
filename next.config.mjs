/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  serverExternalPackages: ['leaflet', 'react-leaflet'],
  // Disable Turbopack - use Webpack for production build
  experimental: {
    turbo: {
      build: false,
    },
  },
}

export default nextConfig
