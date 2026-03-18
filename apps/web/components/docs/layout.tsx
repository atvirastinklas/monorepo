import type { ReactNode } from "react";

import { DocsLayout } from "@/components/layout/docs";

import { getDocsLayoutOptions } from "@/lib/layout.shared";
import { source } from "@/lib/source";

export async function AppDocsLayout({ children }: { children: ReactNode }) {
  const options = await getDocsLayoutOptions();

  return (
    <DocsLayout tree={source.getPageTree()} {...options}>
      {children}
    </DocsLayout>
  );
}
