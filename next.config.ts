import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/docs/kullanim-kilavuzu",
        destination: "/docs/guide",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
