import type { ReactNode } from "react";

import { DocsLayout } from "@/components/layout/docs";
import { getDevicesPageTree } from "@/lib/devices";
import { getDocsLayoutOptions } from "@/lib/layout.shared";

export async function DeviceDocsLayout({ children }: { children: ReactNode }) {
  const options = await getDocsLayoutOptions();

  return (
    <DocsLayout
      tree={getDevicesPageTree()}
      {...options}
      sidebar={{
        treeTitle: "Įrengiai",
      }}
      searchToggle={{
        ...options.searchToggle,
        enabled: false,
      }}
    >
      {children}
    </DocsLayout>
  );
}
