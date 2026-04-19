import { defineCollection, defineConfig } from "@content-collections/core";
import { compileMDX } from "@content-collections/mdx";
import { z } from "zod";

const supportedMesh = z.enum(["meshcore", "meshtastic"]);
const deviceType = z.enum(["companion", "repeater", "standalone"]);
const productKind = z.enum(["developmentKit", "finishedProduct"]);
const platform = z.enum(["esp32", "nrf52", "rp2040"]);

export const devices = defineCollection({
  name: "devices",
  directory: "content/devices",
  include: "**/*.mdx",
  schema: z.object({
    content: z.string(),
    title: z.string(),
    description: z.string().optional(),
    brand: z.string(),
    photo: z.string().optional(),
    supportedMesh: z.array(supportedMesh),
    deviceType,
    productKind,
    featured: z.boolean(),
    deprecated: z.boolean(),
    platform
  }),
  transform: async (document, context) => {
    const [makerSlug, deviceSlug] = document._meta.path.split("/");

    return {
      ...document,
      makerSlug,
      deviceSlug,
      slugSegments: [makerSlug, deviceSlug],
      url: `/zinynas/irenginiai/${makerSlug}/${deviceSlug}`,
      mdx: await compileMDX(context, document),
    };
  },
});

function readingTimeMinutesFromContent(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.ceil(words / 200);
  return Math.max(1, minutes);
}

export const blogPosts = defineCollection({
  name: "blogPosts",
  directory: "content/blogas",
  include: "**/*.mdx",
  schema: z.object({
    content: z.string(),
    title: z.string(),
    description: z.string(),
    datePublished: z.coerce.date(),
    coverImage: z.string().optional(),
    authors: z.array(z.string()),
    tags: z.array(z.string()),
    categories: z.array(z.string()),
  }),
  transform: async (document, context) => {
    const segments = document._meta.path.split("/");
    const slug = segments[segments.length - 1] ?? document._meta.path;

    return {
      ...document,
      slug,
      url: `/blogas/${slug}`,
      readingTimeMinutes: readingTimeMinutesFromContent(document.content),
      mdx: await compileMDX(context, document),
    };
  },
});

export default defineConfig({
  content: [devices, blogPosts],
});
