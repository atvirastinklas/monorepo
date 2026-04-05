import { RiArrowRightLine, RiCpuLine } from "@remixicon/react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import Image from "next/image";

import { type DeviceShowcaseItem, getLandingDeviceSections } from "@/lib/devices";
import { DevicePlatformIcon, getDevicePlatformLabel } from "@/lib/device-platforms";

import { cn } from "@workspace/ui/lib/utils";

function DeviceCard({
  item,
  readMoreLabel,
  deprecatedLabel,
  className,
}: {
  item: DeviceShowcaseItem;
  readMoreLabel: string;
  deprecatedLabel: string;
  className?: string;
}) {
  return (
    <li className={className}>
      <Link
        href={item.url}
        className="group flex h-full min-w-0 flex-col overflow-hidden rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <div className="relative mb-4 aspect-4/3 w-full overflow-hidden rounded-lg border bg-white">
          {item.imageSrc ? (
            <Image
              src={item.imageSrc}
              alt={item.name}
              fill
              className="object-contain p-2 transition-transform duration-200 group-hover:scale-[1.02]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <RiCpuLine className="size-14 text-muted-foreground/50" aria-hidden />
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          {item.deprecated ? (
            <div className="mb-3">
              <span className="inline-flex items-center rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-800 dark:text-amber-300">
                {deprecatedLabel}
              </span>
            </div>
          ) : null}
          <h4 className="text-balance font-semibold tracking-tight transition-colors group-hover:text-primary">
            {item.name}
          </h4>
          <p className="mt-1 text-sm text-muted-foreground">{item.brand}</p>
          <div className="mt-3">
            <span className="inline-flex items-center gap-2 rounded-md border bg-muted/50 px-2.5 py-1 text-sm text-muted-foreground">
              <DevicePlatformIcon platform={item.platform} className="size-4 shrink-0" />
              <span>{getDevicePlatformLabel(item.platform)}</span>
            </span>
          </div>
          <div className="mt-auto pt-4">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground/80 transition-colors group-hover:text-primary">
              {readMoreLabel}
              <RiArrowRightLine
                className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden
              />
            </span>
          </div>
        </div>
      </Link>
    </li>
  );
}

export async function DevicesShowcase() {
  const t = await getTranslations("DevicesSection");
  const readMoreLabel = t("readMore");
  const deprecatedLabel = t("deprecatedBadge");
  const sections = getLandingDeviceSections();

  return (
    <section className="border-t bg-muted/40 py-14 md:py-20" aria-labelledby="devices-heading">
      <div className="mx-auto w-full max-w-6xl px-6">
        <h2
          id="devices-heading"
          className="mb-8 text-2xl font-bold tracking-tight md:mb-10 md:text-3xl"
        >
          {t("heading")}
        </h2>

        {sections.map((section, sectionIndex) => {
          return (
            <div
              key={section.id}
              className={cn(
                sectionIndex > 0 && "mt-12 border-t border-border pt-12 md:mt-16 md:pt-16",
              )}
            >
              <h3
                id={`devices-${section.id}-title`}
                className="text-xl font-semibold tracking-tight md:text-2xl"
              >
                {t(`groups.${section.id}.title`)}
              </h3>
              <p className="mt-2 max-w-2xl text-base text-muted-foreground sm:text-lg">
                {t(`groups.${section.id}.subtitle`)}
              </p>
              <div className="mt-8">
                <ul
                  className="flex flex-wrap items-stretch gap-4 p-0 sm:gap-5"
                  aria-labelledby={`devices-${section.id}-title`}
                >
                  {section.items.map((item) => (
                    <DeviceCard
                      key={item.id}
                      item={item}
                      readMoreLabel={readMoreLabel}
                      deprecatedLabel={deprecatedLabel}
                      className="min-w-0 basis-full list-none sm:basis-[calc((100%-1.25rem)/2)] lg:basis-[calc((100%-2.5rem)/3)] xl:basis-[calc((100%-3.75rem)/4)]"
                    />
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
