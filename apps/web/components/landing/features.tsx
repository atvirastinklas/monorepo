import type { RemixiconComponentType } from "@remixicon/react";
import {
  RiShareForwardLine,
  RiShieldKeyholeLine,
  RiSignalTowerLine,
  RiSunLine,
  RiWifiOffLine,
} from "@remixicon/react";
import { getTranslations } from "next-intl/server";

import { cn } from "@workspace/ui/lib/utils";

const FEATURE_KEYS = [
  "offGrid",
  "longRange",
  "meshNetworking",
  "privateSecure",
  "disasterSolar",
] as const;

const FEATURE_ICONS: Record<
  (typeof FEATURE_KEYS)[number],
  RemixiconComponentType
> = {
  offGrid: RiWifiOffLine,
  longRange: RiSignalTowerLine,
  meshNetworking: RiShareForwardLine,
  privateSecure: RiShieldKeyholeLine,
  disasterSolar: RiSunLine,
};

export async function FeaturesSection() {
  const t = await getTranslations("FeaturesSection");

  return (
    <section
      className="border-t bg-muted/40 py-14 md:py-20"
      aria-labelledby="features-heading"
    >
      <div className="mx-auto w-full max-w-6xl px-6">
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-6 lg:gap-4 xl:grid-cols-5 xl:gap-5">
          {FEATURE_KEYS.map((key, index) => {
            const Icon = FEATURE_ICONS[key];
            const isLast = index === FEATURE_KEYS.length - 1;
            return (
              <li
                key={key}
                className={cn(
                  index < 3 && "lg:col-span-2 xl:col-span-1 xl:col-start-auto",
                  index === 3 &&
                    "lg:col-span-2 lg:col-start-2 xl:col-span-1 xl:col-start-auto",
                  isLast &&
                    "sm:col-span-2 sm:flex sm:justify-center lg:col-span-2 lg:block xl:col-span-1",
                )}
              >
                <article
                  className={cn(
                    "flex h-full w-full flex-col rounded-xl border bg-card p-6 shadow-sm",
                    isLast && "max-w-md sm:mx-auto lg:mx-0 lg:max-w-none",
                  )}
                >
                  <Icon
                    className="mb-4 size-8 shrink-0 text-foreground"
                    aria-hidden
                  />
                  <h3 className="font-semibold tracking-tight">
                    {t(`items.${key}.title`)}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {t(`items.${key}.description`)}
                  </p>
                </article>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
