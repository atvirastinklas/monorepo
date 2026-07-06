import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { getTranslations } from "next-intl/server";

import { docsI18n } from "@/lib/docs-i18n";
import { RiBook3Line, RiDeviceLine, RiGalleryLine, RiNewsLine } from "@remixicon/react";

export async function getDocsLayoutOptions(): Promise<BaseLayoutProps> {
  const t = await getTranslations();

  return {
    i18n: docsI18n,
    nav: {
      title: t("Root.projectName"),
    },
    links: [
      {
        icon: <RiBook3Line className="size-4" />,
        text: t("Navbar.menu.docs"),
        url: "/zinynas",
        on: "menu",
        active: "none",
      },
      {
        icon: <RiDeviceLine className="size-4" />,
        text: t("Navbar.menu.device-catalog"),
        url: "/zinynas/irenginiai",
        on: "menu",
        active: "none",
      },
      {
        icon: <RiNewsLine className="size-4" />,
        text: t("Navbar.menu.blog"),
        url: "/blogas",
        on: "menu",
        active: "none",
      },
      {
        icon: <RiGalleryLine className="size-4" />,
        text: t("Navbar.menu.gallery"),
        url: "/galerija",
        on: "menu",
        active: "none",
      }
    ]
  };
}
