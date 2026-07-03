import { z } from "zod";

import galleryManifest from "@/public/assets/gallery/gallery.json";

const galleryImageSchema = z.object({
  id: z.string().min(1),
  src: z.string().refine((value) => value.startsWith("/assets/gallery/"), {
    message: 'src must start with "/assets/gallery/"',
  }),
  title: z.string().min(1),
  description: z.string().min(1),
});

export type GalleryImage = z.infer<typeof galleryImageSchema>;

function parseGalleryManifest(manifest: unknown): GalleryImage[] {
  const result = z.array(galleryImageSchema).safeParse(manifest);

  if (!result.success) {
    throw new Error(`[gallery] Invalid gallery.json: ${result.error.message}`);
  }

  const seenIds = new Set<string>();
  for (const image of result.data) {
    if (seenIds.has(image.id)) {
      throw new Error(`[gallery] Duplicate gallery image id "${image.id}"`);
    }
    seenIds.add(image.id);
  }

  return result.data;
}

export const allGalleryImages: GalleryImage[] = parseGalleryManifest(galleryManifest);

export function getGalleryImageIndex(id: string): number {
  return allGalleryImages.findIndex((image) => image.id === id);
}
