import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { Button } from "@workspace/ui/components/button";

export async function HeroSection() {
  const t = await getTranslations("HeroSection");

  return (
    <main className="flex-1">
      <section className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-16 md:grid-cols-2 md:items-center md:py-24">
        <div className="space-y-6">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {t("title")}
          </h1>
          <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
            {t("description")}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href="/zinynas">{t("cta.getStarted")}</Link>
            </Button>
            <Button asChild size="lg" variant="outline" disabled>
              <Link href="#map">{t("cta.map")}</Link>
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-dashed bg-muted/40 p-2">
          <div className="relative aspect-4/3 overflow-hidden rounded-md border bg-background">
            <Image
              src="/images/hero.jpg"
              alt={t("imageAlt")}
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>
      </section>
    </main>
  );
}
