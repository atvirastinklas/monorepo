import { MDXContent } from "@content-collections/mdx/react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import * as CarouselComponents from "@workspace/ui/components/carousel";
import * as TabsComponents from "fumadocs-ui/components/tabs";

import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "@/components/layout/docs/page";
import type { BlogPostDocument } from "@/lib/blog";
import { resolveAuthors, resolveCategories, resolveTags } from "@/lib/blog";
import { getMDXComponents } from "@/mdx-components";

function formatPublishedDate(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(date);
}

export async function AppBlogPostPage({
  post,
  locale = "lt-LT",
}: {
  post: BlogPostDocument;
  locale?: string;
}) {
  const t = await getTranslations("BlogPage");
  const authors = resolveAuthors(post.authors);
  const categories = resolveCategories(post.categories);
  const tags = resolveTags(post.tags);

  return (
    <DocsPage breadcrumb={{ enabled: false }} footer={{ enabled: false }} className="max-w-3xl">
      <div className="flex flex-col gap-4 text-sm text-muted-foreground">
        <p>
          {[
            formatPublishedDate(post.datePublished, locale),
            ...authors.map((author) => author.displayName),
            t("readingTime", { minutes: post.readingTimeMinutes })
          ].join(" · ")}
        </p>
        <DocsTitle className="text-black dark:text-white">{post.title}</DocsTitle>
        {/* <DocsDescription className="mb-0">{post.description}</DocsDescription> */}


        {post.coverImage ? (
          <div className="relative aspect-video w-full overflow-hidden rounded-xl border">
            <Image
              src={post.coverImage}
              alt={post.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 768px"
              priority
            />
          </div>
        ) : null}
      </div>

      <DocsBody>
        <MDXContent
          code={post.mdx}
          components={getMDXComponents({
            img: (props) => <img {...props} />,
            ...TabsComponents,
            ...CarouselComponents,
          })}
        />
      </DocsBody>

      <div className="flex flex-row gap-4 border-t pt-4">
        {categories.length > 0 ? (
          <div>
            <p className="mb-2 font-medium text-foreground">{t("categories")}</p>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <span
                  key={c.alias}
                  className="inline-flex rounded-md border bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground"
                >
                  {c.displayName}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {tags.length > 0 ? (
          <div>
            <p className="mb-2 font-medium text-foreground">{t("tags")}</p>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag.alias}
                  className="inline-flex rounded-md border border-dashed px-2.5 py-1 text-xs"
                >
                  {tag.displayName}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </DocsPage>
  );
}
