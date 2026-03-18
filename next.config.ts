import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";

const securityHeaders = [
  {
    // Voorkomt clickjacking aanvallen
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    // Voorkomt MIME type sniffing
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    // Verouderde header, zet op 0 — CSP biedt XSS-bescherming
    key: 'X-XSS-Protection',
    value: '0',
  },
  {
    // Controleert referrer informatie
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    // Beperkt browser features/APIs
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  {
    // Forceert HTTPS voor 2 jaar + preload
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    // Content Security Policy - beschermt tegen XSS
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://www.google.com https://www.gstatic.com https://www.googletagmanager.com https://www.google-analytics.com https://vercel.live https://www.clarity.ms https://c.clarity.ms https://scripts.clarity.ms https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https://*.supabase.co https://www.google-analytics.com https://www.googletagmanager.com https://www.google.com https://www.gstatic.com https://lh3.googleusercontent.com https://images.unsplash.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "frame-src https://www.google.com https://vercel.live",
      "worker-src 'self' blob:",
      "connect-src 'self' https://www.google.com https://www.googletagmanager.com https://www.google-analytics.com https://region1.google-analytics.com https://analytics.google.com https://*.supabase.co wss://*.supabase.co https://vercel.live https://*.clarity.ms https://vitals.vercel-insights.com https://va.vercel-scripts.com https://*.ingest.sentry.io",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  trailingSlash: true, // Fix voor redirect errors op diensten pagina's
  productionBrowserSourceMaps: false,
  compress: true,
  poweredByHeader: false,
  outputFileTracingIncludes: {
    '/': ['./middleware.ts'],
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/api/:path*/",
          destination: "/api/:path*",
        },
      ],
    };
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 dagen cache
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'nntxpyoyrpquzghsnwxj.supabase.co',
        pathname: '/storage/v1/object/**',
      },
    ],
  },
  reactStrictMode: true,
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['recharts', 'zod', '@supabase/supabase-js', 'lucide-react', 'date-fns', 'react-hook-form', '@tanstack/react-query', 'react-day-picker', 'framer-motion', '@mollie/api-client'],
  },
  async headers() {
    return [
      {
        // Pas security headers toe op alle routes
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // Cache statische images voor 1 jaar
        source: '/images/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // Cache Next.js static assets voor 1 jaar
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // Cache fonts voor 1 jaar
        source: '/fonts/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // API responses: niet cachen
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // Non-www naar www redirect
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'toptalentjobs.nl',
          },
        ],
        destination: 'https://www.toptalentjobs.nl/:path*',
        permanent: true,
      },
      // Oude WordPress pagina redirects
      {
        source: '/horeca-evenementen',
        destination: '/diensten/uitzenden/',
        permanent: true,
      },
      {
        source: '/horeca-evenementen/',
        destination: '/diensten/uitzenden/',
        permanent: true,
      },
      {
        source: '/employer-public',
        destination: '/contact/',
        permanent: true,
      },
      {
        source: '/employer-public/',
        destination: '/contact/',
        permanent: true,
      },
      // Oude WordPress query parameters redirects
      {
        source: '/',
        has: [
          {
            type: 'query',
            key: 'page_id',
          },
        ],
        destination: '/',
        permanent: true,
      },
      {
        source: '/',
        has: [
          {
            type: 'query',
            key: 'wpr_templates',
          },
        ],
        destination: '/',
        permanent: true,
      },
      // Blokkeer oude WordPress paths
      {
        source: '/wp-content/:path*',
        destination: '/',
        permanent: true,
      },
      {
        source: '/wp-includes/:path*',
        destination: '/',
        permanent: true,
      },
    ];
  },
};

const analyzeBundles = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export default withSentryConfig(analyzeBundles(nextConfig), {
  org: "toptalent",
  project: "javascript-nextjs",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
});
