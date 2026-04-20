/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    APP_DOMAIN: process.env.APP_DOMAIN || '',
  },
};

export default nextConfig;
