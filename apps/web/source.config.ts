import { z } from "zod";
import { defineConfig, defineDocs, frontmatterSchema } from "fumadocs-mdx/config";

const DOCS_SOURCE_ROOT = "apps/web/content/docs";

function getDocsSourcePath(filePath: string) {
  const normalizedPath = filePath.replaceAll("\\", "/");
  const appDocsRoot = `${DOCS_SOURCE_ROOT}/`;
  const appDocsRootIndex = normalizedPath.lastIndexOf(appDocsRoot);

  if (appDocsRootIndex !== -1) {
    return normalizedPath.slice(appDocsRootIndex);
  }

  const contentDocsRoot = "content/docs/";
  const contentDocsRootIndex = normalizedPath.lastIndexOf(contentDocsRoot);

  if (contentDocsRootIndex !== -1) {
    return `apps/web/${normalizedPath.slice(contentDocsRootIndex)}`;
  }

  return `${appDocsRoot}${normalizedPath.replace(/^\/+/, "")}`;
}

export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    files: ["**/*.mdx", "!**/_dalys/**"],
    schema: ({ path }) =>
      frontmatterSchema.extend({
        sourcePath: z.string().default(getDocsSourcePath(path)),
      }),
  },
});

export default defineConfig();
