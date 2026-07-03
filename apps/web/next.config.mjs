import { createContentCollectionPlugin } from "@content-collections/next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import { createMDX } from "fumadocs-mdx/next";
import createNextIntlPlugin from "next-intl/plugin";

const withContentCollections = createContentCollectionPlugin({
  configPath: "./content-collections.ts",
});
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");
const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui", "@workspace/map"],
  async redirects() {
    return [
      {
        source: "/zinynas/meshcore/retransliatorius/pavadinimai",
        destination: "/zinynas/meshcore/retransliatorius/vardai",
        permanent: true,
      },
    ];
  },
};

export default withContentCollections(withMDX(withNextIntl(nextConfig)));

initOpenNextCloudflareForDev();
