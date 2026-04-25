import Link from "next/link";

import type { BlogPostDocument } from "@/lib/blog";
import { resolveAuthors } from "@/lib/blog";

import { cn } from "@workspace/ui/lib/utils";

function formatPublishedDate(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(date);
}

export function BlogPostCard({
  post,
  className,
  locale = "lt-LT",
}: {
  post: BlogPostDocument;
  className?: string;
  locale?: string;
}) {
  const authors = resolveAuthors(post.authors);
  const authorLine = authors.map((a) => a.displayName).join(", ");

  return (
    <li className={cn("list-none", className)}>
      <Link
        href={post.url}
        className="group block border-b py-4 transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 -mx-2 rounded-lg px-2 sm:-mx-3 sm:px-3"
      >
        <div className="flex max-w-3xl flex-col gap-2">
          <h2 className="text-xl font-semibold tracking-tight text-balance transition-colors group-hover:text-primary md:text-2xl">
            {post.title}
          </h2>
          <time
            className="text-sm text-muted-foreground"
            dateTime={post.datePublished.toISOString()}
          >
            {formatPublishedDate(post.datePublished, locale)}
          </time>
          <p className="text-base leading-relaxed text-muted-foreground">{post.description}</p>
          <p className="text-sm text-foreground/90">{authorLine}</p>
        </div>
      </Link>
    </li>
  );
}
