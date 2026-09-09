/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: { unoptimized: true },
  swcMinify: false,
  webpack: (config) => {
    config.parallelism = 1;
    return config;
  },
};

module.exports = nextConfig;
