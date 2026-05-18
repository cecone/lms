/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    // pdfjs-dist tenta usar canvas — não existe no browser bundle
    config.resolve.alias.canvas = false
    return config
  },
}

export default nextConfig;
