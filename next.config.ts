import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Serve as imagens (logo etc.) sem a otimização do servidor. Evita o erro
  // "isn't a valid image / received null" no deploy e não precisa do sharp.
  images: {
    unoptimized: true,
  },
  // Build com Webpack (mais estável e leve de memória no servidor) +
  // otimização de memória, evitando crashes de build por falta de RAM.
  experimental: {
    webpackMemoryOptimizations: true,
  },
};

export default nextConfig;
