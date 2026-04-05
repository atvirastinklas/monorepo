import type { ReactNode } from "react";

import { AppDocsLayout } from "@/components/docs/layout";

export default async function Layout({ children }: { children: ReactNode }) {
  return <AppDocsLayout>{children}</AppDocsLayout>;
}
