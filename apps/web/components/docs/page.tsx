import { getTranslations } from "next-intl/server";
import type { ComponentProps, ComponentType } from "react";

import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  EditOnGitHub,
} from "@/components/layout/docs/page";
import { MeshcoreRepeatersList } from "@/components/meshcore/repeaters-list";
import { getGitHubEditUrl } from "@/lib/github";
import { source } from "@/lib/source";
import { getMDXComponents } from "@/mdx-components";
import * as CarouselComponents from "@workspace/ui/components/carousel";
import { ImageZoom } from "fumadocs-ui/components/image-zoom";
import * as TabsComponents from "fumadocs-ui/components/tabs";
import { createRelativeLink } from "fumadocs-ui/mdx";
import { NamingRegionMap } from "../maps/naming-region-map";
import { NamingFormatValidator } from "./naming-format-validator";

type WikiPage = NonNullable<ReturnType<typeof source.getPage>>;

type AppDocsPageProps = {
  page: WikiPage;
};

type MdxPageData = {
  title: string;
  description?: string;
  body: ComponentType<{
    components?: Record<string, unknown>;
  }>;
  toc?: unknown;
  full?: boolean;
  sourcePath: string;
};

export async function AppDocsPage({ page }: AppDocsPageProps) {
  const t = await getTranslations("DocsPage");
  const data = page.data as unknown as MdxPageData;
  const MDX = data.body;
  const toc = data.toc as ComponentProps<typeof DocsPage>["toc"];
  const editUrl = getGitHubEditUrl(data.sourcePath);

  return (
    <DocsPage toc={toc} full={data.full}>
      <DocsTitle className="flex flex-col items-start justify-between gap-2 sm:flex-row">
        <span className="min-w-0">{data.title}</span>
        <EditOnGitHub className="shrink-0 whitespace-nowrap" href={editUrl} />
      </DocsTitle>
      <DocsDescription>{data.description ?? t("fallbackDescription")}</DocsDescription>
      <DocsBody>
        <MDX
          components={getMDXComponents({
            a: createRelativeLink(source, page),
            img: ImageZoom,
            ...TabsComponents,
            ...CarouselComponents,
            NamingFormatValidator: NamingFormatValidator,
            NamingRegionMap: NamingRegionMap,
            MeshcoreRepeatersList: MeshcoreRepeatersList,
          })}
        />
      </DocsBody>
    </DocsPage>
  );
}
