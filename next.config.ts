/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',          // 🔥 ISSO AQUI É CRUCIAL
  trailingSlash: true,
  images: {
    unoptimized: true       // Necessário para export estático
  },
}

export default nextConfig;
