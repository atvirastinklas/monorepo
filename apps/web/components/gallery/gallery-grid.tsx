"use client";

import * as React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

import { AspectRatio } from "@workspace/ui/components/aspect-ratio";

import { GalleryLightbox } from "@/components/gallery/gallery-lightbox";
import type { GalleryImage } from "@/lib/gallery";

type GalleryGridProps = {
  images: GalleryImage[];
};

export function GalleryGrid({ images }: GalleryGridProps) {
  const t = useTranslations("GalleryPage");
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);

  return (
    <>
      <ul className="grid grid-cols-1 gap-6 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((image, index) => (
          <li key={image.id} className="list-none">
            <button
              type="button"
              onClick={() => setOpenIndex(index)}
              className="group block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label={t("openImageAriaLabel", { title: image.title })}
            >
              <AspectRatio ratio={4 / 3} className="overflow-hidden rounded-xl border bg-muted">
                <Image
                  src={image.src}
                  alt={`${image.title} — ${image.description}`}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                />
              </AspectRatio>
              <div className="mt-3">
                <p className="font-semibold tracking-tight">{image.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{image.description}</p>
              </div>
            </button>
          </li>
        ))}
      </ul>

      <GalleryLightbox
        images={images}
        openIndex={openIndex}
        onOpenChange={(open) => {
          if (!open) {
            setOpenIndex(null);
          }
        }}
      />
    </>
  );
}
