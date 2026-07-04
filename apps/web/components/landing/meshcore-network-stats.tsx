import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getTranslations } from "next-intl/server";
import { unstable_noStore as noStore } from "next/cache";

import { getMeshcoreRepeaterStats } from "@/lib/server/meshcore/repeaters";
import { Button } from "@workspace/ui/components/button";
import { ExternalLinkIcon } from "lucide-react";

const repeaterCountFormatter = new Intl.NumberFormat("lt-LT");

export async function MeshcoreNetworkStats() {
  noStore();

  const t = await getTranslations("MeshcoreStatsSection");
  const { env } = getCloudflareContext();
  const stats = await getMeshcoreRepeaterStats(env.DB);

  return (
    <section
      className="border-t bg-muted/40 py-14 md:py-20"
      aria-labelledby="meshcore-stats-heading"
    >
      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="mb-8 md:mb-10">
          <h2 id="meshcore-stats-heading" className="text-2xl font-bold tracking-tight md:text-3xl">
            {t("heading")}
          </h2>
          <p className="mt-2 max-w-2xl text-base text-muted-foreground sm:text-lg">
            {t("subtitle")}
          </p>
        </div>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-5">
          {stats.regions.map((region) => (
            <li key={region.iata}>
              <article className="flex h-full flex-col rounded-xl border bg-card p-6 shadow-sm">
                <span className="text-sm font-medium text-muted-foreground">
                  {t(`regions.${region.iata}`)}
                </span>
                <span className="mt-3 text-3xl font-bold tracking-tight">
                  {repeaterCountFormatter.format(region.count)}
                </span>
                <span className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {region.iata}
                </span>
              </article>
            </li>
          ))}
          <li className="sm:col-span-2 lg:col-span-1">
            <article className="flex h-full flex-col rounded-xl border border-primary/40 bg-primary/5 p-6 shadow-sm">
              <span className="text-sm font-medium text-primary">{t("totalLabel")}</span>
              <span className="mt-3 text-3xl font-bold tracking-tight text-primary">
                {repeaterCountFormatter.format(stats.total)}
              </span>
            </article>
          </li>
        </ul>
        <div className="pt-6">
          <Button asChild size="lg">
            <a href="https://meshcore.atvirastinklas.lt/#/map" about="_blank">{t("cta")}<ExternalLinkIcon className="ml-2 h-4 w-4" /></a>
          </Button>
        </div>
      </div>
    </section>
  );
}
