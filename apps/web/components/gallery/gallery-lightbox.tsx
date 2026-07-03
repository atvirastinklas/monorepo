"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@workspace/ui/components/carousel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@workspace/ui/components/dialog";

import type { GalleryImage } from "@/lib/gallery";

type GalleryLightboxProps = {
  images: GalleryImage[];
  openIndex: number | null;
  onOpenChange: (open: boolean) => void;
};

export function GalleryLightbox({ images, openIndex, onOpenChange }: GalleryLightboxProps) {
  const t = useTranslations("GalleryPage");
  const [api, setApi] = React.useState<CarouselApi>();
  const [activeIndex, setActiveIndex] = React.useState(openIndex ?? 0);

  React.useEffect(() => {
    if (!api) {
      return;
    }

    setActiveIndex(api.selectedScrollSnap());

    const handleSelect = () => {
      setActiveIndex(api.selectedScrollSnap());
    };

    api.on("select", handleSelect);
    return () => {
      api.off("select", handleSelect);
    };
  }, [api]);

  const activeImage = images[activeIndex];

  return (
    <Dialog
      open={openIndex !== null}
      onOpenChange={(open) => {
        if (!open) {
          onOpenChange(false);
        }
      }}
    >
      <DialogContent className="max-w-3xl gap-4 p-4 sm:max-w-4xl">
        <Carousel
          opts={{ startIndex: openIndex ?? 0, loop: images.length > 1 }}
          setApi={setApi}
          className="w-full"
        >
          <CarouselContent>
            {images.map((image) => (
              <CarouselItem key={image.id}>
                <div className="flex max-h-[70vh] w-full items-center justify-center overflow-hidden rounded-lg bg-muted/30">
                  <img
                    src={image.src}
                    alt={`${image.title} — ${image.description}`}
                    className="max-h-[70vh] w-full object-contain"
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>

          {images.length > 1 ? (
            <>
              <CarouselPrevious className="left-2 sm:left-4" aria-label={t("lightbox.previous")} />
              <CarouselNext className="right-2 sm:right-4" aria-label={t("lightbox.next")} />
            </>
          ) : null}
        </Carousel>

        {activeImage ? (
          <div className="px-1 text-center">
            <DialogTitle className="text-base font-semibold tracking-tight">
              {activeImage.title}
            </DialogTitle>
            <DialogDescription className="mt-1">{activeImage.description}</DialogDescription>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
