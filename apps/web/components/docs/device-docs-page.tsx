import { MDXContent } from "@content-collections/mdx/react";
import { RiCpuLine } from "@remixicon/react";
import { getTranslations } from "next-intl/server";
import Image from "next/image";

import { DocsBody, DocsPage, DocsTitle } from "@/components/layout/docs/page";
import { cn } from "@/lib/cn";
import type { DeviceDocument } from "@/lib/devices";
import { DevicePlatformIcon, getDevicePlatformLabel } from "@/lib/device-platforms";
import { getMDXComponents } from "@/mdx-components";
import * as CarouselComponents from "@workspace/ui/components/carousel";
import { ImageZoom } from "fumadocs-ui/components/image-zoom";
import * as TabsComponents from "fumadocs-ui/components/tabs";

import { NamingRegionMap } from "../maps/naming-region-map";
import { NamingFormatValidator } from "./naming-format-validator";

function getDeviceTypeTranslationKey(deviceType: DeviceDocument["deviceType"]) {
  switch (deviceType) {
    case "companion":
      return "typeCompanion";
    case "repeater":
      return "typeRepeater";
    case "standalone":
      return "typeStandalone";
  }
}

function getMeshLabel(mesh: DeviceDocument["supportedMesh"][number]) {
  switch (mesh) {
    case "meshcore":
      return "MeshCore";
    case "meshtastic":
      return "Meshtastic";
  }
}

function getProductKindTranslationKey(productKind: DeviceDocument["productKind"]) {
  switch (productKind) {
    case "developmentKit":
      return "productKindDevelopmentKit";
    case "finishedProduct":
      return "productKindFinishedProduct";
  }
}

export async function AppDeviceDocsPage({ device }: { device: DeviceDocument }) {
  const t = await getTranslations("DevicePage");

  return (
    <DocsPage>
      <DocsTitle>{device.title}</DocsTitle>

      {device.featured || device.deprecated ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {device.featured ? (
            <span className="inline-flex items-center rounded-md border bg-muted/60 px-2.5 py-1 text-sm font-medium">
              {t("featuredBadge")}
            </span>
          ) : null}
          {device.deprecated ? (
            <span className="inline-flex items-center rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-sm font-medium text-amber-800 dark:text-amber-300">
              {t("deprecatedBadge")}
            </span>
          ) : null}
        </div>
      ) : null}

      <section className="mb-8 grid gap-8 md:grid-cols-2 md:items-start md:gap-10">
        <div className="relative aspect-4/3 overflow-hidden rounded-xl border bg-white">
          {device.photo ? (
            <Image
              src={device.photo}
              alt={device.title}
              fill
              className="object-contain p-4"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          ) : (
            <div
              className="flex h-full min-h-64 w-full flex-col items-center justify-center gap-2 px-4 text-center text-muted-foreground"
              role="img"
              aria-label={t("noPhoto")}
            >
              <RiCpuLine className="size-14 opacity-50" aria-hidden />
              <span className="text-sm">{t("noPhoto")}</span>
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <dl className="grid gap-4 text-sm">
            <div>
              <dt className="mb-1 font-medium text-muted-foreground">{t("brand")}</dt>
              <dd className="text-base">{device.brand}</dd>
            </div>
            <div>
              <dt className="mb-1 font-medium text-muted-foreground">{t("deviceType")}</dt>
              <dd className="text-base">{t(getDeviceTypeTranslationKey(device.deviceType))}</dd>
            </div>
            <div>
              <dt className="mb-1 font-medium text-muted-foreground">{t("productKind")}</dt>
              <dd className="text-base">
                {t(getProductKindTranslationKey(device.productKind))}
              </dd>
            </div>
            <div>
              <dt className="mb-1 font-medium text-muted-foreground">{t("platform")}</dt>
              <dd className="text-base">
                <span className="inline-flex items-center gap-2">
                  <DevicePlatformIcon platform={device.platform} className="size-5 shrink-0" />
                  <span>{getDevicePlatformLabel(device.platform)}</span>
                </span>
              </dd>
            </div>
            <div>
              <dt className="mb-2 font-medium text-muted-foreground">{t("supportedMesh")}</dt>
              <dd className="flex flex-wrap gap-2">
                {device.supportedMesh.map((mesh) => (
                  <span
                    key={mesh}
                    className={cn(
                      "inline-flex items-center rounded-md border bg-muted/50 px-2.5 py-1 text-sm",
                    )}
                  >
                    {getMeshLabel(mesh)}
                  </span>
                ))}
              </dd>
            </div>
          </dl>

          {device.description ? (
            <p className="text-base leading-relaxed text-muted-foreground">{device.description}</p>
          ) : null}
        </div>
      </section>

      <DocsBody>
        <MDXContent
          code={device.mdx}
          components={getMDXComponents({
            img: ImageZoom,
            ...TabsComponents,
            ...CarouselComponents,
            NamingFormatValidator: NamingFormatValidator,
            NamingRegionMap: NamingRegionMap,
          })}
        />
      </DocsBody>
    </DocsPage>
  );
}
