import { MDXContent } from "@content-collections/mdx/react";
import { RiCpuLine } from "@remixicon/react";
import { getTranslations } from "next-intl/server";
import Image from "next/image";

import { DocsBody, DocsPage, DocsTitle } from "@/components/layout/docs/page";
import { cn } from "@/lib/cn";
import type { DeviceDocument } from "@/lib/devices";
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

function getMeshTranslationKey(mesh: DeviceDocument["supportedMesh"][number]) {
  switch (mesh) {
    case "meshcore":
      return "meshMeshcore";
    case "meshtastic":
      return "meshMeshtastic";
  }
}

export async function AppDeviceDocsPage({ device }: { device: DeviceDocument }) {
  const t = await getTranslations("DevicePage");

  return (
    <DocsPage>
      <DocsTitle>{device.title}</DocsTitle>

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
              <dt className="mb-2 font-medium text-muted-foreground">{t("supportedMesh")}</dt>
              <dd className="flex flex-wrap gap-2">
                {device.supportedMesh.map((mesh) => (
                  <span
                    key={mesh}
                    className={cn(
                      "inline-flex items-center rounded-md border bg-muted/50 px-2.5 py-1 text-sm",
                    )}
                  >
                    {t(getMeshTranslationKey(mesh))}
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
