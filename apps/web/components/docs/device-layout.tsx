import { RiBook3Line, RiNewsLine } from "@remixicon/react";
import type { ReactNode } from "react";

import { DocsLayout } from "@/components/layout/docs";
import { getDevicesPageTree } from "@/lib/devices";
import { getDocsLayoutOptions, getDocsLayoutSidebarTabs } from "@/lib/layout.shared";

export async function DeviceDocsLayout({ children }: { children: ReactNode }) {
  const options = await getDocsLayoutOptions();
  const sidebarTabs = await getDocsLayoutSidebarTabs();

  return (
    <DocsLayout
      tree={getDevicesPageTree()}
      {...options}
      sidebar={{ tabs: sidebarTabs }}
      searchToggle={{
        ...options.searchToggle,
        enabled: false,
      }}
    >
      {children}
    </DocsLayout>
  );
}
