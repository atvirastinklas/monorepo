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

export default defineConfig({
  content: [devices],
});
