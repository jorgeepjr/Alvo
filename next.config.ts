import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Build com Webpack (mais estável e leve de memória no servidor) +
  // otimização de memória, evitando crashes de build por falta de RAM.
  experimental: {
    webpackMemoryOptimizations: true,
  },
};

export default nextConfig;
