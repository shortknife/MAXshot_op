/** @type {import('next').NextConfig} */
const nextConfig = {
  // 禁用静态优化，确保在运行时访问环境变量
  output: 'standalone',
}

export default nextConfig
