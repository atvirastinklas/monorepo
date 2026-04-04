import type { Metadata } from "next";
import { Noto_Sans } from "next/font/google";
import { getMessages } from "next-intl/server";

import "@/app/globals.css";
import { Providers } from "@/components/providers";
import { defaultLocale, defaultTimeZone } from "@/i18n/config";

const siteTitle = "Atviras Tinklas";

export const metadata: Metadata = {
  title: {
    default: siteTitle,
    template: `%s - ${siteTitle}`,
  },
};

const fontNotoSans = Noto_Sans({
  subsets: ["latin"],
  variable: "--font-noto-sans",
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const messages = await getMessages();

  return (
    <html lang={defaultLocale} suppressHydrationWarning>
      <body
        className={`${fontNotoSans.variable} font-noto-sans antialiased flex min-h-screen flex-col`}
      >
        <Providers locale={defaultLocale} messages={messages} timeZone={defaultTimeZone}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
