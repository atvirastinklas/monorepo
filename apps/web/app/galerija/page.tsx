import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { GalleryGrid } from "@/components/gallery/gallery-grid";
import { allGalleryImages } from "@/lib/gallery";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("GalleryPage");

  return {
    title: t("listTitle"),
    description: t("listDescription"),
  };
}

export default async function GalerijaIndexPage() {
  const t = await getTranslations("GalleryPage");

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10 md:py-14">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{t("listTitle")}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{t("listDescription")}</p>
      </header>

      {allGalleryImages.length > 0 ? (
        <GalleryGrid images={allGalleryImages} />
      ) : (
        <p className="text-muted-foreground">{t("empty")}</p>
      )}
    </div>
  );
}
