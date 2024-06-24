/** @type {import('next').NextConfig} */
const nextConfig = {
      // output: 'export',
  images: {
    domains: ["lh3.googleusercontent.com"],
  },
  env: {
    WORK_ENV: process.env.WORK_ENV,
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "https://ominous-engine-q766v6jx45r34qx9.github.dev"],
      // allowedForwardedHosts: ["localhost:3000"],
      // ^ You might have to use this property depending on your exact version.
    }
  }
};

export default nextConfig;
