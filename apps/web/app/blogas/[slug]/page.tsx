import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AppBlogPostPage } from "@/components/blog/blog-post-page";
import { getAllBlogPostParams, getBlogPostBySlug } from "@/lib/blog";

type BlogArticlePageProps = {
  params: Promise<{ slug: string }>;
};

export default async function BlogArticlePage({ params }: BlogArticlePageProps) {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return <AppBlogPostPage post={post} />;
}

export function generateStaticParams() {
  return getAllBlogPostParams();
}

export async function generateMetadata({ params }: BlogArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    return {};
  }

  return {
    title: post.title,
    description: post.description,
    openGraph: post.coverImage
      ? {
          images: [{ url: post.coverImage }],
        }
      : undefined,
  };
}
