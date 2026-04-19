import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@workspace/ui/components/button";
import { ThemeToggle } from "../layout/theme-toggle";

export async function Footer() {
  const t = await getTranslations("Footer");

  const footerLinks: Array<{ href: string; label: string }> = [
    // { href: "/privacy", label: t("links.privacy") }
  ];

  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>{t("tagLine")}</p>
        <div className="flex items-center gap-1">
          {footerLinks.map((item) => (
            <Button key={item.href} asChild variant="ghost" size="sm">
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
        </div>
        <div>
          <ThemeToggle className="p-0" />
        </div>
      </div>
    </footer>
  );
}
