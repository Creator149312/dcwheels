/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export',
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "s4.anilist.co" },
      { protocol: "https", hostname: "image.tmdb.org" },
      { protocol: "https", hostname: "media.rawg.io" },
    ],
  },
  env: {
    WORK_ENV: process.env.WORK_ENV,
  },
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "https://ominous-engine-q766v6jx45r34qx9.github.dev",
      ],
      // allowedForwardedHosts: ["localhost:3000"],
      // ^ You might have to use this property depending on your exact version.
    },
  },
  async redirects() {
    return [
      {
        source: "/wheels/random-sex-position-picker",
        destination: "https://www.domainconverters.com/",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
