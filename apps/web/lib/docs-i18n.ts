import { defineI18n } from "fumadocs-core/i18n";
import { defineI18nUI } from "fumadocs-ui/i18n";

import { defaultLocale } from "@/i18n/config";

export const docsI18n = defineI18n({
  defaultLanguage: defaultLocale,
  languages: [defaultLocale],
});

const { provider } = defineI18nUI(docsI18n, {
  translations: {
    lt: {
      displayName: "Lietuvių",
      search: "Ieškoti",
      toc: "Turinys",
    },
  },
});

export const getDocsI18nProvider = provider;
