import Image from "next/image";
import Link from "next/link";

import type { BlogPostDocument } from "@/lib/blog";
import { resolveAuthors, resolveCategories } from "@/lib/blog";

import { cn } from "@workspace/ui/lib/utils";

function formatPublishedDate(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(date);
}

export function BlogPostCard({
  post,
  className,
  readingTimeLabel,
  locale = "lt-LT",
}: {
  post: BlogPostDocument;
  className?: string;
  readingTimeLabel: string;
  locale?: string;
}) {
  const authors = resolveAuthors(post.authors);
  const authorLine = authors.map((a) => a.displayName).join(", ");
  const categories = resolveCategories(post.categories);
  const metadata = [
    formatPublishedDate(post.datePublished, locale),
    authorLine,
    readingTimeLabel,
  ].filter(Boolean);

  return (
    <li className={cn("list-none", className)}>
      <Link
        href={post.url}
        className={cn(
          "group grid gap-5 rounded-xl border bg-card p-5 shadow-sm transition-colors hover:border-primary/40 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:p-6",
          post.coverImage && "sm:grid-cols-[1fr_12rem]",
        )}
      >
        <div className="flex min-w-0 flex-col gap-3">
          <p className="text-sm text-muted-foreground">{metadata.join(" · ")}</p>

          <h2 className="text-balance text-xl font-semibold tracking-tight transition-colors group-hover:text-primary md:text-2xl">
            {post.title}
          </h2>

          <p className="text-base leading-relaxed text-muted-foreground">{post.description}</p>

          {categories.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <span
                  key={category.alias}
                  className="inline-flex rounded-md border bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground"
                >
                  {category.displayName}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {post.coverImage ? (
          <div className="relative aspect-video overflow-hidden rounded-lg border bg-muted sm:aspect-4/3">
            <Image
              src={post.coverImage}
              alt={post.coverTitle ?? post.title}
              fill
              className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
              sizes="(max-width: 640px) 100vw, 192px"
            />
          </div>
        ) : null}
      </Link>
    </li>
  );
}
