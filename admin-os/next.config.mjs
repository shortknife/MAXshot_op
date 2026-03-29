import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 禁用静态优化，确保在运行时访问环境变量
  output: 'standalone',
  turbopack: { root: __dirname },
  experimental: { externalDir: true },
}

export default nextConfig
