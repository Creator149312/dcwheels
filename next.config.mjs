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
    // ─── Global Vercel image-optimizer kill-switch ─────────────────────────
    // Why this is set to `true` for every <Image> in the app:
    //
    //  1) Blob-stored uploads (wheel previews, segment images) are ALREADY
    //     optimized at upload time by lib/uploads.js: sharp resizes to
    //     ≤800×800 and re-encodes as WebP@q82, typically yielding 20–80 KB.
    //     Re-running them through Vercel's optimizer would shave maybe
    //     10–20% more — not worth the billable transformations + cache
    //     writes.
    //
    //  2) External CDN sources (s4.anilist.co, image.tmdb.org, media.rawg.io,
    //     lh3.googleusercontent.com) already serve pre-sized, geo-CDN-cached
    //     variants. Vercel re-fetching → re-encoding → re-storing them is
    //     pure waste and triggers all four billable lines (origin egress,
    //     transform compute, cache write, cache read).
    //
    //  3) With ~200 source images and the default 8 device-sizes × 2 formats,
    //     Vercel was generating up to 16 variants per source (= ~3,200
    //     transformations + cache writes). Globally disabling the optimizer
    //     drops that to ZERO.
    //
    // Trade-offs we accept by setting this:
    //   - No automatic responsive `srcset` from <Image>. Browsers download
    //     a single variant. For blob images this is fine because we
    //     pre-size them; for external CDNs we already pick an explicit
    //     size in the URL (e.g. tmdb /w342/, anilist /large/).
    //   - No automatic AVIF fallback. Acceptable because WebP is universal
    //     in 2025+ and our pipelines already produce WebP at upload.
    //
    // If we ever need to re-enable optimization for a SPECIFIC image, you
    // can set `unoptimized={false}` on that one <Image>. Default-deny is
    // intentional — the burden of proof is on each new optimization use.
    unoptimized: true,

    // The fields below are no-ops while `unoptimized: true` is set, but we
    // keep them so re-enabling optimization (per-image or globally) gives
    // sane defaults: WebP-only (skip costly AVIF), trim mid/high device
    // sizes we never hit, and 30-day CDN cache for any optimized variant.
    formats: ["image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    dangerouslyAllowSVG: false,
  },
  env: {
    WORK_ENV: process.env.WORK_ENV,
  },
  experimental: {
    // NOTE: We tried `experimental.optimizeCss: true` (which uses Critters
    // to inline critical CSS) but as of Next.js 14.2.4 it does not process
    // App Router stylesheets — React 18.3+'s `data-precedence` attribute
    // is not understood by Critters, so the optimization silently no-ops.
    // Re-enable when upgrading to a Next.js version that supports it.
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
