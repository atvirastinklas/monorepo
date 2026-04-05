import type { ReactNode } from "react";

import { DeviceDocsLayout } from "@/components/docs/device-layout";

export default async function Layout({ children }: { children: ReactNode }) {
  return <DeviceDocsLayout>{children}</DeviceDocsLayout>;
}
