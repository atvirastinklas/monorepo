"use client";

import { useMemo, useState } from "react";

import { MESHCORE_IATA_REGIONS, type MeshcoreIataRegion } from "@/lib/meshcore/regions";

export type MeshcoreRepeaterListItem = {
  iata: string;
  id: string;
  hexId: string;
  name: string;
  lat: number | null;
  lon: number | null;
  lastHeard: number | null;
  enabled: boolean;
  hopBytes: number | null;
  recordedAt: number;
};

type MeshcoreRepeatersClientProps = {
  repeaters: MeshcoreRepeaterListItem[];
  showTitle?: boolean;
  recordedAtMax: number | null;
};

type RegionFilter = MeshcoreIataRegion | "all";

const vilniusDateTimeFormatter = new Intl.DateTimeFormat("lt-LT", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Europe/Vilnius",
});

export function MeshcoreRepeatersClient({
  repeaters,
  showTitle = true,
  recordedAtMax,
}: MeshcoreRepeatersClientProps) {
  const [region, setRegion] = useState<RegionFilter>("all");
  const [publicKeyPrefix, setPublicKeyPrefix] = useState("");
  const [nameQuery, setNameQuery] = useState("");

  const normalizedPublicKeyPrefix = normalizePublicKeyPrefix(publicKeyPrefix);
  const normalizedNameQuery = normalizeSearchText(nameQuery);
  const filteredRepeaters = useMemo(
    () =>
      repeaters.filter((repeater) => {
        const matchesRegion = region === "all" || repeater.iata === region;
        const matchesPublicKey =
          normalizedPublicKeyPrefix.length === 0 ||
          repeater.hexId.toUpperCase().startsWith(normalizedPublicKeyPrefix);
        const matchesName =
          normalizedNameQuery.length === 0 ||
          normalizeSearchText(repeater.name).includes(normalizedNameQuery);

        return matchesRegion && matchesPublicKey && matchesName;
      }),
    [normalizedNameQuery, normalizedPublicKeyPrefix, region, repeaters],
  );

  return (
    <section className="not-prose my-6 rounded-xl border bg-fd-card text-fd-card-foreground">
      <div className="space-y-4 border-b p-4">
        <div>
          {showTitle ? <h3 className="font-semibold text-lg">Retransliatoriai tinkle</h3> : null}
          <p className="text-fd-muted-foreground text-sm">
            Duomenys paimti iš MeshMapper sistemos ir atnaujinami kas 30 minučių.
          </p>
        </div>
        <MeshcoreRepeatersFilters
          nameQuery={nameQuery}
          publicKeyPrefix={publicKeyPrefix}
          region={region}
          onNameQueryChange={setNameQuery}
          onPublicKeyPrefixChange={setPublicKeyPrefix}
          onRegionChange={setRegion}
        />
      </div>
      <MeshcoreRepeatersTable repeaters={filteredRepeaters} />
      <div className="flex flex-col gap-2 border-b p-4 text-fd-muted-foreground text-sm sm:flex-row sm:items-center sm:justify-between">
        <span>
          Rodoma {filteredRepeaters.length} iš {repeaters.length} retransliatorių.
        </span>
        <span>Atnaujinta: {formatUnixSeconds(recordedAtMax)}</span>
      </div>
    </section>
  );
}

type MeshcoreRepeatersFiltersProps = {
  region: RegionFilter;
  publicKeyPrefix: string;
  nameQuery: string;
  onRegionChange: (region: RegionFilter) => void;
  onPublicKeyPrefixChange: (publicKeyPrefix: string) => void;
  onNameQueryChange: (nameQuery: string) => void;
};

function MeshcoreRepeatersFilters({
  region,
  publicKeyPrefix,
  nameQuery,
  onRegionChange,
  onPublicKeyPrefixChange,
  onNameQueryChange,
}: MeshcoreRepeatersFiltersProps) {
  return (
    <form
      className="grid gap-3 sm:grid-cols-[minmax(8rem,12rem)_minmax(12rem,1fr)_minmax(12rem,1fr)]"
      onSubmit={(event) => event.preventDefault()}
    >
      <label className="space-y-1.5">
        <span className="font-medium text-sm">IATA regionas</span>
        <select
          className="w-full rounded-md border bg-fd-background px-3 py-2 text-sm"
          value={region}
          onChange={(event) => onRegionChange(event.target.value as RegionFilter)}
        >
          <option value="all">Visi</option>
          {MESHCORE_IATA_REGIONS.map((iata) => (
            <option key={iata} value={iata}>
              {iata}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1.5">
        <span className="font-medium text-sm">Vardo dalis</span>
        <input
          className="w-full rounded-md border bg-fd-background px-3 py-2 text-sm"
          inputMode="text"
          placeholder="Pvz. LY7MS"
          value={nameQuery}
          onChange={(event) => onNameQueryChange(event.target.value)}
        />
      </label>
      <label className="space-y-1.5">
        <span className="font-medium text-sm">Viešo rakto pradžia</span>
        <input
          className="w-full rounded-md border bg-fd-background px-3 py-2 font-mono text-sm"
          inputMode="text"
          placeholder="Pvz. 03CB"
          value={publicKeyPrefix}
          onChange={(event) => onPublicKeyPrefixChange(event.target.value)}
        />
      </label>
    </form>
  );
}

function MeshcoreRepeatersTable({ repeaters }: { repeaters: MeshcoreRepeaterListItem[] }) {
  if (repeaters.length === 0) {
    return (
      <p className="p-4 text-fd-muted-foreground text-sm">
        Pagal pasirinktus filtrus retransliatorių nerasta.
      </p>
    );
  }

  return (
    <div className="max-h-128 overflow-auto">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 bg-fd-muted/95 text-left backdrop-blur">
          <tr>
            <th className="px-4 py-3 font-medium">Vardas</th>
            <th className="px-4 py-3 font-medium">Regionas</th>
            <th className="px-4 py-3 font-medium">Viešas raktas</th>
            <th className="px-4 py-3 font-medium">Paskutinį kartą girdėtas</th>
          </tr>
        </thead>
        <tbody>
          {repeaters.map((repeater) => (
            <tr className="border-t" key={`${repeater.iata}-${repeater.hexId}`}>
              <td className="px-4 py-3 font-medium">{repeater.name}</td>
              <td className="px-4 py-3">{repeater.iata}</td>
              <td className="px-4 py-3">
                <code
                  className="rounded bg-fd-muted px-1.5 py-0.5 font-mono text-xs"
                  title={repeater.hexId}
                >
                  {shortenPublicKey(repeater.hexId)}
                </code>
              </td>
              <td className="px-4 py-3">{formatUnixSeconds(repeater.lastHeard)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function normalizePublicKeyPrefix(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}

function normalizeSearchText(value: string) {
  return value.trim().toLocaleLowerCase("lt-LT");
}

function shortenPublicKey(value: string) {
  return value.length > 14 ? `${value.slice(0, 14)}...` : value;
}

function formatUnixSeconds(value: number | null) {
  if (value === null) {
    return "-";
  }

  const date = new Date(value * 1000);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return `${vilniusDateTimeFormatter.format(date)}`;
}
