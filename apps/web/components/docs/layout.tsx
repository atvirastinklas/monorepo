import type { ReactNode } from "react";

import { DocsLayout } from "@/components/layout/docs";

import { getDocsLayoutOptions, getDocsLayoutSidebarTabs } from "@/lib/layout.shared";
import { source } from "@/lib/source";

export async function AppDocsLayout({ children }: { children: ReactNode }) {
  const options = await getDocsLayoutOptions();
  const sidebarTabs = await getDocsLayoutSidebarTabs();

  return (
    <DocsLayout tree={source.getPageTree()} sidebar={{ tabs: sidebarTabs }} {...options}>
      {children}
    </DocsLayout>
  );
}
