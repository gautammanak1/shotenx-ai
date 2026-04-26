import withMdkCheckout from "@moneydevkit/nextjs/next-plugin";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["uagent-client"],
  turbopack: { root: currentDir },
  async rewrites() {
    return [
      {
        source: "/backend/:path*",
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL}/:path*`,
      },
    ];
  },
};

export default withMdkCheckout(nextConfig);
