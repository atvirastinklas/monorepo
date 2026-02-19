export const locales = ["lt"] as const;

export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "lt";
export const defaultTimeZone = "Europe/Vilnius";
