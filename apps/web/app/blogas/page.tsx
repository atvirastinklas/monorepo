import { getTranslations } from "next-intl/server";

import { BlogPostCard } from "@/components/blog/blog-post-card";
import { allBlogPosts } from "@/lib/blog";

export default async function BlogasIndexPage() {
  const t = await getTranslations("BlogPage");

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10 md:py-14">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{t("listTitle")}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{t("listDescription")}</p>
      </header>

      {allBlogPosts.length > 0 ? (
        <ul className="flex flex-col p-0">
          {allBlogPosts.map((post) => (
            <BlogPostCard key={post.slug} post={post} />
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">{t("empty")}</p>
      )}
    </div>
  );
}
