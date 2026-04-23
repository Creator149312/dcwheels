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
    // Serve AVIF when the browser accepts it, fall back to WebP. Both are
    // dramatically smaller than JPEG/PNG (AVIF ~50% of WebP, WebP ~70% of
    // JPEG). Order matters — the first accepted format wins.
    formats: ["image/avif", "image/webp"],
    // Cache optimized variants on the CDN for 30 days instead of the default
    // 60 seconds. Our source images (wheel previews, blob-hosted user
    // uploads) are effectively immutable — re-optimizing them every minute
    // is pure waste on the image-optimizer. If a user replaces an upload,
    // the new upload gets a new URL (addRandomSuffix: true in lib/uploads),
    // so cache staleness isn't a concern.
    minimumCacheTTL: 60 * 60 * 24 * 30,
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
  async headers() {
    return [
      {
        // Allow embedding /embed/* pages in iframes on any origin
        source: "/embed/:path*",
        headers: [
          { key: "X-Frame-Options", value: "ALLOWALL" },
          { key: "Content-Security-Policy", value: "frame-ancestors *" },
        ],
      },
    ];
  },
};

export default nextConfig;
