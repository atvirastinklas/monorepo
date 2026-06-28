import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { BlogPostCard } from "@/components/blog/blog-post-card";
import { allBlogPosts, getBlogCategorySummaries } from "@/lib/blog";
import { cn } from "@/lib/cn";

type BlogasIndexPageProps = {
  searchParams?: Promise<{
    rubrika?: string | string[];
  }>;
};

function getFirstSearchParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default async function BlogasIndexPage({ searchParams }: BlogasIndexPageProps) {
  const t = await getTranslations("BlogPage");
  const categories = getBlogCategorySummaries();
  const params = await searchParams;
  const selectedCategoryFromParams = getFirstSearchParamValue(params?.rubrika);
  const selectedCategory = categories.find(
    (category) => category.alias === selectedCategoryFromParams,
  );
  const selectedCategoryAlias = selectedCategory?.alias;
  const visiblePosts = selectedCategoryAlias
    ? allBlogPosts.filter((post) => post.categories.includes(selectedCategoryAlias))
    : allBlogPosts;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10 md:py-14">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{t("listTitle")}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{t("listDescription")}</p>
      </header>

      {allBlogPosts.length > 0 ? (
        <div className="grid gap-8 lg:grid-cols-[16rem_1fr] lg:items-start">
          <aside className="rounded-xl border bg-card p-5 shadow-sm lg:sticky lg:top-28">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t("categories")}
            </h2>
            <nav className="mt-4 flex flex-col gap-1" aria-label={t("categories")}>
              <Link
                href="/blogas"
                className={cn(
                  "flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted hover:text-foreground",
                  !selectedCategoryAlias
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground",
                )}
                aria-current={!selectedCategoryAlias ? "page" : undefined}
              >
                <span>{t("allArticles")}</span>
                <span className="text-muted-foreground">{allBlogPosts.length}</span>
              </Link>

              {categories.map((category) => (
                <Link
                  key={category.alias}
                  href={`/blogas?rubrika=${encodeURIComponent(category.alias)}`}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted hover:text-foreground",
                    selectedCategoryAlias === category.alias
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground",
                  )}
                  aria-current={selectedCategoryAlias === category.alias ? "page" : undefined}
                >
                  <span>{category.displayName}</span>
                  <span>{category.count}</span>
                </Link>
              ))}
            </nav>
          </aside>

          {visiblePosts.length > 0 ? (
            <ul className="flex flex-col gap-5 p-0">
              {visiblePosts.map((post) => (
                <BlogPostCard
                  key={post.slug}
                  post={post}
                  readingTimeLabel={t("readingTime", { minutes: post.readingTimeMinutes })}
                />
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">{t("empty")}</p>
          )}
        </div>
      ) : (
        <p className="text-muted-foreground">{t("empty")}</p>
      )}
    </div>
  );
}
