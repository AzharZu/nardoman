/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true,
  outputFileTracingRoot: process.cwd(),
  webpack: (config, { dev }) => {
    // Disable webpack filesystem cache in dev to prevent corrupted pack warnings like:
    // "[webpack.cache.PackFileCacheStrategy] ... unexpected end of file"
    if (dev) config.cache = false;
    return config;
  }
};

export default nextConfig;
