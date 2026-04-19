import { RiBook3Line, RiNewsLine } from "@remixicon/react";
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
      links={[
        {
          text: "Žinynas",
          icon: <RiBook3Line className="size-4" />,
          url: "/zinynas",
          on: "menu",
          active: "none",
        },
        ...(options.links ?? []),
      ]}
      searchToggle={{
        ...options.searchToggle,
        enabled: false,
      }}
    >
      {children}
    </DocsLayout>
  );
}
