"use client";

import { NextIntlClientProvider } from "next-intl";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type * as React from "react";
import type { ComponentProps } from "react";
import { RootProvider } from "fumadocs-ui/provider/next";

import { getDocsI18nProvider } from "@/lib/docs-i18n";

type NextIntlMessages = ComponentProps<typeof NextIntlClientProvider>["messages"];

type ProvidersProps = {
  children: React.ReactNode;
  locale: string;
  messages: NextIntlMessages;
  timeZone: string;
};

export function Providers({ children, locale, messages, timeZone }: ProvidersProps) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone}>
      <NextThemesProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
        enableColorScheme
      >
        <RootProvider i18n={getDocsI18nProvider(locale)} theme={{ enabled: false }}>
          {children}
        </RootProvider>
      </NextThemesProvider>
    </NextIntlClientProvider>
  );
}
