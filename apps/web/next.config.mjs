import createNextIntlPlugin from "next-intl/plugin";
import { createMDX } from "fumadocs-mdx/next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");
const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui", "@workspace/map"],
};

export default withMDX(withNextIntl(nextConfig));

initOpenNextCloudflareForDev();
