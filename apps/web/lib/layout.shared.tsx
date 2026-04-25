import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { getTranslations } from "next-intl/server";

import { docsI18n } from "@/lib/docs-i18n";
import { RiBook3Line, RiDeviceLine, RiNewsLine } from "@remixicon/react";
import { SidebarTabWithProps } from "@/components/layout/sidebar/tabs/dropdown";

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
        text: t("Navbar.menu.blog"),
        url: "/blogas",
        on: "menu",
        active: "none",
      }
    ]
  };
}

export async function getDocsLayoutSidebarTabs(): Promise<SidebarTabWithProps[]> {
  const t = await getTranslations();

  return [
    {
      title: t("Navbar.menu.docs"),
      icon: <RiBook3Line className="size-4" />,
      url: "/zinynas"
    },
    {
      title: t("Navbar.menu.device-catalog"),
      icon: <RiDeviceLine className="size-4" />,
      url: "/zinynas/irenginiai"
    }
  ];
}
