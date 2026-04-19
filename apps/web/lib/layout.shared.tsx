import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { getTranslations } from "next-intl/server";

import { docsI18n } from "@/lib/docs-i18n";
import { RiNewsLine } from "@remixicon/react";

export async function getDocsLayoutOptions(): Promise<BaseLayoutProps> {
  const t = await getTranslations();

  return {
    i18n: docsI18n,
    nav: {
      title: t("Root.projectName"),
    },
    links: [
      {
        icon: <RiNewsLine className="size-4" />,
        text: "Blogas",
        url: "/blogas",
        on: "menu",
        active: "none",
      }
    ]
  };
}
