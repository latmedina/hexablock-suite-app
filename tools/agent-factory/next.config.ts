import type { NextConfig } from 'next';

/**
 * `next dev` refuses its own scripts to browsers that open it by a name other than localhost, which leaves the
 * dashboard stuck on "Conectando…". Allow Tailscale names (*.ts.net) plus FACTORY_DEV_ORIGINS (comma-separated
 * hosts or IPs, e.g. "100.117.196.35").
 */
const devOrigins = ['**.ts.net', ...(process.env.FACTORY_DEV_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean)];

const nextConfig: NextConfig = {
  // Prompt files are read at runtime from ./prompts
  outputFileTracingIncludes: { '/api/**': ['./prompts/**'] },
  // The repo already has its own AGENTS.md rules; do not let `next dev` write another one here.
  agentRules: false,
  allowedDevOrigins: devOrigins,
  // Two lockfiles (repo root and this tool): this folder is the app root.
  turbopack: { root: __dirname },
};

export default nextConfig;
