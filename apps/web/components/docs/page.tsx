import type { ComponentProps, ComponentType } from "react";
import { getTranslations } from "next-intl/server";

import { ImageZoom } from 'fumadocs-ui/components/image-zoom';
import * as TabsComponents from 'fumadocs-ui/components/tabs';
import { getMDXComponents } from "@/mdx-components";
import { source } from "@/lib/source";
import { createRelativeLink } from "fumadocs-ui/mdx";
import * as CarouselComponents from "@workspace/ui/components/carousel";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "@/components/layout/docs/page";
import { NamingFormatValidator } from "./naming-format-validator";
import { NamingRegionMap } from "../maps/naming-region-map";

type ResolvedDocsPage = NonNullable<ReturnType<typeof source.getPage>>;

type AppDocsPageProps = {
  page: ResolvedDocsPage;
};

type MdxPageData = {
  title: string;
  description?: string;
  body: ComponentType<{
    components?: Record<string, unknown>;
  }>;
  toc?: unknown;
  full?: boolean;
};

export async function AppDocsPage({ page }: AppDocsPageProps) {
  const t = await getTranslations("DocsPage");
  const data = page.data as unknown as MdxPageData;
  const MDX = data.body;
  const toc = data.toc as ComponentProps<typeof DocsPage>["toc"];

  return (
    <DocsPage toc={toc} full={data.full}>
      <DocsTitle>{data.title}</DocsTitle>
      <DocsDescription>{data.description ?? t("fallbackDescription")}</DocsDescription>
      <DocsBody>
        <MDX
          components={getMDXComponents({
            a: createRelativeLink(source, page),
            img: ImageZoom,
            ...TabsComponents,
            ...CarouselComponents,
            NamingFormatValidator: NamingFormatValidator,
            NamingRegionMap: NamingRegionMap
          })}
        />
      </DocsBody>
    </DocsPage>
  );
}
