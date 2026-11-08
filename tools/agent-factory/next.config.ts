import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Prompt files are read at runtime from ./prompts
  outputFileTracingIncludes: { '/api/**': ['./prompts/**'] },
};

export default nextConfig;
