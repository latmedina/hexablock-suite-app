import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Prompt files are read at runtime from ./prompts
  outputFileTracingIncludes: { '/api/**': ['./prompts/**'] },
  // The repo already has its own AGENTS.md rules; do not let `next dev` write another one here.
  agentRules: false,
  // Two lockfiles (repo root and this tool): this folder is the app root.
  turbopack: { root: __dirname },
};

export default nextConfig;
