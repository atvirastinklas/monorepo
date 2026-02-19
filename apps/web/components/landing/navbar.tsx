"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { RiMenuLine } from "@remixicon/react";

import { Button } from "@workspace/ui/components/button";

export function Navbar() {
  const t = useTranslations("Navbar");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const menuItems = [
    { href: "/zinynas", label: t("menu.docs") },
  ];

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prevState) => !prevState);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <header className="fixed inset-x-0 top-4 z-50">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="flex items-center justify-between rounded-xl border bg-background px-4 py-3 shadow-sm">
            <div className="flex items-center gap-6">
              <Link href="/" className="text-lg font-semibold tracking-tight">
                Atviras Tinklas
              </Link>
              <nav className="hidden items-center gap-4 text-sm text-muted-foreground sm:flex">
                {menuItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="transition-colors hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                className="sm:hidden"
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-main-menu"
                onClick={toggleMobileMenu}
              >
                <RiMenuLine className="size-4" />
              </Button>
            </div>
          </div>
        </div>
        {isMobileMenuOpen ? (
          <div className="sm:hidden">
            <button
              type="button"
              className="fixed inset-x-0 bottom-0 top-24 z-40 bg-black/35"
              aria-label={t("mobile.closeMenuAriaLabel")}
              onClick={closeMobileMenu}
            />
            <div
              id="mobile-main-menu"
              className="fixed inset-x-4 z-50 rounded-lg bg-background p-3 shadow-lg border border-t-0"
            >
              <nav className="flex flex-col gap-1">
                {menuItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    onClick={closeMobileMenu}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        ) : null}
      </header>
      <div aria-hidden className="h-24" />
    </>
  );
}
