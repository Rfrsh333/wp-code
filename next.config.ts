import type { NextConfig } from "next";

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
    // Activeert XSS filter in browsers
    key: 'X-XSS-Protection',
    value: '1; mode=block',
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
    // Forceert HTTPS voor 1 jaar
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
  {
    // Content Security Policy - beschermt tegen XSS
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com https://www.googletagmanager.com https://www.google-analytics.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "frame-src https://www.google.com",
      "connect-src 'self' https://www.google.com https://www.googletagmanager.com https://www.google-analytics.com https://region1.google-analytics.com https://analytics.google.com https://*.supabase.co",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  experimental: {
    optimizeCss: true,
  },
  async headers() {
    return [
      {
        // Pas security headers toe op alle routes
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    return [
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
    ];
  },
};

export default nextConfig;
