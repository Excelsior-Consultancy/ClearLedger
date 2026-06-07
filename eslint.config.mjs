import nextConfig from 'eslint-config-next/core-web-vitals'

const base = Array.isArray(nextConfig) ? nextConfig : [nextConfig]

const eslintConfig = [
  { ignores: ['.next/**', '.worktrees/**', 'node_modules/**', 'prisma/migrations/**'] },
  ...base,
]

export default eslintConfig
