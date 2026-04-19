import blogMetaConfig from "@/content/blogas/meta.json";
import { type BlogPost, allBlogPosts as collectedBlogPosts } from "content-collections";

export type BlogAuthorMeta = {
  displayName: string;
  subtitle?: string;
  avatarImageUrl?: string;
};

export type BlogTagOrCategoryMeta = {
  displayName: string;
};

export type BlogMetaFile = {
  authors: Record<string, BlogAuthorMeta>;
  tags: Record<string, BlogTagOrCategoryMeta>;
  categories: Record<string, BlogTagOrCategoryMeta>;
};

const blogMeta = blogMetaConfig as BlogMetaFile;

export type BlogPostDocument = BlogPost & {
  slug: string;
  url: string;
  mdx: string;
  readingTimeMinutes: number;
};

function isResolvedBlogPost(post: BlogPost): post is BlogPostDocument {
  return Boolean(
    post.slug &&
      post.url &&
      post.mdx &&
      typeof post.readingTimeMinutes === "number",
  );
}

function validateMetaAliases(post: BlogPostDocument): string[] {
  const errors: string[] = [];

  for (const alias of post.authors) {
    if (!blogMeta.authors[alias]) {
      errors.push(`unknown author "${alias}"`);
    }
  }

  for (const alias of post.tags) {
    if (!blogMeta.tags[alias]) {
      errors.push(`unknown tag "${alias}"`);
    }
  }

  for (const alias of post.categories) {
    if (!blogMeta.categories[alias]) {
      errors.push(`unknown category "${alias}"`);
    }
  }

  return errors;
}

function compareBlogPostsByDate(a: BlogPostDocument, b: BlogPostDocument) {
  return b.datePublished.getTime() - a.datePublished.getTime();
}

const resolvedPosts = [...collectedBlogPosts].filter(isResolvedBlogPost);

for (const post of resolvedPosts) {
  const errors = validateMetaAliases(post);
  if (errors.length > 0) {
    throw new Error(`[blog] Post "${post.slug}": ${errors.join("; ")}`);
  }
}

export const allBlogPosts = resolvedPosts.sort(compareBlogPostsByDate);

export function getBlogPostBySlug(slug: string) {
  return allBlogPosts.find((post) => post.slug === slug);
}

export function getAllBlogPostParams() {
  return allBlogPosts.map((post) => ({ slug: post.slug }));
}

export function resolveAuthors(aliases: string[]) {
  return aliases.map((alias) => {
    const author = blogMeta.authors[alias];
    return {
      alias,
      displayName: author?.displayName ?? alias,
      subtitle: author?.subtitle,
      avatarImageUrl: author?.avatarImageUrl,
    };
  });
}

export function resolveTags(aliases: string[]) {
  return aliases.map((alias) => {
    const tag = blogMeta.tags[alias];
    return { alias, displayName: tag?.displayName ?? alias };
  });
}

export function resolveCategories(aliases: string[]) {
  return aliases.map((alias) => {
    const category = blogMeta.categories[alias];
    return { alias, displayName: category?.displayName ?? alias };
  });
}
