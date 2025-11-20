// next.config.ts
import type { NextConfig } from "next";
import crypto from "crypto";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        pathname: "/v0/**",
      },
    ],
  },

  async headers() {
    const nonce = crypto.randomBytes(16).toString("base64");

    const CSP = [
      `default-src 'self'`,
      `script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.razorpay.com https://www.google-analytics.com`,
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
      `img-src 'self' data: blob: https://firebasestorage.googleapis.com https://*.razorpay.com`,
      `font-src 'self' https://fonts.gstatic.com`,
      `connect-src 'self' https://checkout.razorpay.com https://api.razorpay.com https://firebasestorage.googleapis.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.google-analytics.com https://api.postalpincode.in`,
      `frame-src https://*.razorpay.com`,
      `object-src 'none'`,
      `base-uri 'self'`,
      `form-action 'self'`,
      `frame-ancestors 'self'`,
    ].join("; ");

    const securityHeaders = [
      { key: "Content-Security-Policy", value: CSP },
      { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
      { key: "X-Nonce", value: nonce },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      {
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains; preload",
      },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(self)",
      },
      { key: "X-XSS-Protection", value: "1; mode=block" },
      { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
    ];

    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/_next/static/:path*", headers: securityHeaders },
      { source: "/fonts/:path*", headers: securityHeaders },
      { source: "/images/:path*", headers: securityHeaders },
    ];
  },
};

export default nextConfig;
