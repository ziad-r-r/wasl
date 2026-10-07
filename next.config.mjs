/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: { unoptimized: true },
  experimental: {
    serverComponentsExternalPackages: ["@electric-sql/pglite", "pg"],
    outputFileTracingIncludes: {
      "/api/**": ["./db/schema.sql"],
      "/*": ["./db/schema.sql"]
    }
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" }
        ]
      }
    ];
  }
};

export default nextConfig;
