/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // pdfjs-dist tenta usar canvas — não existe no browser bundle
    config.resolve.alias.canvas = false
    return config
  },
}

export default nextConfig;
