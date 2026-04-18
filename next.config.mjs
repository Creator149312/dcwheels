/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export',
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "s4.anilist.co" },
      { protocol: "https", hostname: "image.tmdb.org" },
      { protocol: "https", hostname: "media.rawg.io" },
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
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
      {
        source: "/games",
        destination: "/game",
        permanent: false,
      },
      {
        source: "/movies",
        destination: "/movie",
        permanent: false,
      },
      {
        source: "/characters",
        destination: "/character",
        permanent: false,
      },
      {
        source: "/music",
        destination: "/tags/music",
        permanent: false,
      },
      {
        source: "/sports",
        destination: "/tags/sports",
        permanent: false,
      },
      {
        source: "/travel",
        destination: "/tags/travel",
        permanent: false,
      },
      {
        source: "/food",
        destination: "/tags/food",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
