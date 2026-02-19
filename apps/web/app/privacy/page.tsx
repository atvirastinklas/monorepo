import { getTranslations } from "next-intl/server";

export default async function PrivacyPage() {
  const t = await getTranslations("PrivacyPage");

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-4 text-muted-foreground">{t("description")}</p>
    </main>
  );
}
