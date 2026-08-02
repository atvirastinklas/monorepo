"use client";

import { findSuggestedPrefix, isWithinLithuania } from "@/lib/naming/boundaries";
import {
  type Direction,
  type LocalityOption,
  type NamingCode,
  createSuggestedNames,
  isRepeaterIdentifier,
  maxLocatedNodeNameBytes,
  normalizeIdentifier,
  suggestLocalityOptions,
} from "@/lib/naming/rules";
import {
  RiCheckLine,
  RiCloseLine,
  RiCompass3Line,
  RiFileCopyLine,
  RiFocus3Line,
  RiMapPinLine,
  RiSearchLine,
} from "@remixicon/react";
import { MapLayer, MapLibre, type MapRef, MapSource } from "@workspace/map";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { useTheme } from "next-themes";
import { type FormEvent, type KeyboardEvent, useMemo, useRef, useState } from "react";

type Coordinates = { latitude: number; longitude: number };
type DeviceKind = "repeater" | "observer";
type LocalityLevel =
  | "neighbourhood"
  | "suburb"
  | "city_district"
  | "locality"
  | "hamlet"
  | "village"
  | "town"
  | "city";
type GeocodeLocality = { value: string; level: LocalityLevel };

type PlaceCandidate = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  localities: GeocodeLocality[];
};

type SearchResponse = { data?: unknown };

const directions = [
  ["", "Nenurodyta"],
  ["N", "Šiaurė (N)"],
  ["NE", "Šiaurės rytai (NE)"],
  ["E", "Rytai (E)"],
  ["SE", "Pietryčiai (SE)"],
  ["S", "Pietūs (S)"],
  ["SW", "Pietvakariai (SW)"],
  ["W", "Vakarai (W)"],
  ["NW", "Šiaurės vakarai (NW)"],
] as const;

const tabLabels: Record<DeviceKind, string> = {
  repeater: "Retransliatorius",
  observer: "Stebėtojas",
};

const defaultCoordinates: Coordinates = { latitude: 54.6872, longitude: 25.2797 };
const lithuaniaBounds = [
  [19.5, 53.2],
  [28.0, 57.2],
] as [[number, number], [number, number]];

function mapStyle(theme: string | undefined) {
  return `https://basemaps.cartocdn.com/gl/${theme === "light" ? "voyager-gl-style" : "dark-matter-gl-style"}/style.json`;
}

const localityLevelLabels: Record<LocalityLevel, string> = {
  neighbourhood: "Mikrorajonas",
  suburb: "Miesto dalis",
  city_district: "Miesto rajonas",
  locality: "Vietovė",
  hamlet: "Viensėdis",
  village: "Kaimas",
  town: "Miestas",
  city: "Didmiestis",
};

function parseLocalities(value: unknown): GeocodeLocality[] {
  const levels = new Set<LocalityLevel>(Object.keys(localityLevelLabels) as LocalityLevel[]);
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const locality = item as Record<string, unknown>;
    const name = typeof locality.value === "string" ? locality.value.trim() : "";
    const level = locality.level;
    return name && typeof level === "string" && levels.has(level as LocalityLevel)
      ? [{ value: name, level: level as LocalityLevel }]
      : [];
  });
}

function parseCandidates(payload: unknown): PlaceCandidate[] {
  const rawResults: unknown[] = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as SearchResponse | null)?.data)
      ? ((payload as SearchResponse).data as unknown[])
      : [];

  return rawResults.flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const result = item as Record<string, unknown>;
    const latitude = Number(result.latitude);
    const longitude = Number(result.longitude);
    const label = typeof result.label === "string" ? result.label.trim() : "";
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !label) return [];

    return [
      {
        id: typeof result.id === "string" ? result.id : String(index),
        label,
        latitude,
        longitude,
        localities: parseLocalities(result.localities),
      },
    ];
  });
}

function PinSource({ coordinates }: { coordinates: Coordinates }) {
  const data: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: { type: "Point", coordinates: [coordinates.longitude, coordinates.latitude] },
      },
    ],
  };

  return (
    <MapSource id="naming-location-pin" type="geojson" data={data}>
      <MapLayer
        id="naming-location-pin-halo"
        type="circle"
        paint={{ "circle-radius": 15, "circle-color": "#2563eb", "circle-opacity": 0.18 }}
      />
      <MapLayer
        id="naming-location-pin"
        type="circle"
        paint={{
          "circle-radius": 8,
          "circle-color": "#2563eb",
          "circle-stroke-width": 3,
          "circle-stroke-color": "#ffffff",
        }}
      />
    </MapSource>
  );
}

function localityOptionDescription(option: LocalityOption) {
  const descriptions: Record<LocalityOption["strategy"], string> = {
    original: "Originali vietovė",
    "without-descriptor": "Be vietovės tipo",
    abbreviated: "Sutrumpinti pirmesni žodžiai",
    shortened: "Sutrumpinta iki leistino ilgio",
  };

  return descriptions[option.strategy];
}

export function NamingLocationHelper() {
  const { theme } = useTheme();
  const mapRef = useRef<MapRef>(null);
  const selectionRevision = useRef(0);
  const lastValidCoordinates = useRef<Coordinates | null>(null);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [search, setSearch] = useState("");
  const [candidates, setCandidates] = useState<PlaceCandidate[]>([]);
  const [localities, setLocalities] = useState<GeocodeLocality[]>([]);
  const [selectedLocality, setSelectedLocality] = useState<string | null>(null);
  const [localityState, setLocalityState] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [code, setCode] = useState<NamingCode | null>(null);
  const [place, setPlace] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [direction, setDirection] = useState("");
  const [activeKind, setActiveKind] = useState<DeviceKind>("repeater");
  const [searchState, setSearchState] = useState<"idle" | "loading" | "error">("idle");
  const [hasSearched, setHasSearched] = useState(false);
  const [gpsState, setGpsState] = useState<"idle" | "loading" | "error">("idle");
  const [locationError, setLocationError] = useState("");
  const [copied, setCopied] = useState<DeviceKind | null>(null);

  const cleanIdentifier = normalizeIdentifier(identifier);
  const effectiveIdentifier = cleanIdentifier || "FF";
  const hasIdentifierError = Boolean(cleanIdentifier) && !isRepeaterIdentifier(cleanIdentifier);
  const hasPlaceError = Boolean(coordinates) && !place.trim();
  const canGenerate = Boolean(
    code && coordinates && place.trim() && isRepeaterIdentifier(effectiveIdentifier),
  );
  const suggestedNames = useMemo(
    () =>
      canGenerate
        ? createSuggestedNames({
            code: code as NamingCode,
            place,
            identifier: effectiveIdentifier,
            direction: direction as Direction | undefined,
          })
        : null,
    [canGenerate, code, direction, effectiveIdentifier, place],
  );
  const needsShortening = Boolean(
    suggestedNames && (!suggestedNames.repeater.fits || !suggestedNames.observer.fits),
  );
  const shorteningOptions = useMemo(
    () =>
      needsShortening && code
        ? suggestLocalityOptions({
            code,
            locality: place,
            identifier: effectiveIdentifier,
            direction: direction as Direction | undefined,
          }).filter((option) => option.value !== place.trim())
        : [],
    [code, direction, effectiveIdentifier, needsShortening, place],
  );
  const activeSuggestion = suggestedNames?.[activeKind];
  const activeNeedsShortening = Boolean(activeSuggestion && !activeSuggestion.fits);

  const setPin = async (nextCoordinates: Coordinates) => {
    const revision = ++selectionRevision.current;
    setLocationError("");
    setCode(null);
    setCandidates([]);
    setHasSearched(false);
    setLocalities([]);
    setSelectedLocality(null);
    setPlace("");
    setLocalityState("loading");

    // The pin moves immediately. Errors stay in an overlay so the map never reflows.
    setCoordinates(nextCoordinates);
    mapRef.current?.flyTo({
      center: [nextCoordinates.longitude, nextCoordinates.latitude],
      zoom: 13,
    });

    try {
      if (!(await isWithinLithuania(nextCoordinates))) {
        if (revision === selectionRevision.current) {
          setCoordinates(lastValidCoordinates.current);
          setLocationError("Pasirinkite vietą Lietuvos teritorijoje.");
          setLocalityState("idle");
        }
        return;
      }

      lastValidCoordinates.current = nextCoordinates;
      if (!cleanIdentifier) setIdentifier("FF");
      const prefix = await findSuggestedPrefix(nextCoordinates);
      if (revision !== selectionRevision.current) return;
      if (!prefix) {
        setLocationError("Šiai vietai nepavyko parinkti vietovės kodo.");
      } else {
        setCode(prefix.code);
      }

      const response = await fetch("/api/geocode/reverse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextCoordinates),
      });
      if (revision !== selectionRevision.current) return;
      if (!response.ok) {
        if (response.status === 429) {
          setLocationError(
            "Vietovės nustatymo paslauga šiuo metu užimta. Bandykite dar kartą po kelių sekundžių.",
          );
        } else if (response.status === 502 || response.status === 503) {
          setLocationError(
            "Vietovės nustatymo paslauga laikinai nepasiekiama. Vietovės pavadinimą galite įrašyti ranka arba bandyti vėliau.",
          );
        } else {
          setLocationError("Nepavyko nustatyti vietovės. Bandykite dar kartą.");
        }
        setLocalityState("error");
        return;
      }

      const reverseCandidates = parseCandidates(await response.json());
      if (revision !== selectionRevision.current) return;
      setLocalities(reverseCandidates[0]?.localities ?? []);
      setLocalityState("success");
    } catch {
      if (revision === selectionRevision.current) {
        setLocationError("Nepavyko patikrinti vietos. Bandykite dar kartą.");
        setLocalityState("error");
      }
    }
  };

  const chooseCandidate = (candidate: PlaceCandidate) => {
    void setPin({ latitude: candidate.latitude, longitude: candidate.longitude });
  };

  const submitSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = search.trim();
    if (!query) return;
    setSearchState("loading");
    setHasSearched(true);
    setCandidates([]);
    try {
      const response = await fetch("/api/geocode/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: query }),
      });
      if (!response.ok) throw new Error("Geocoding request failed");
      setCandidates(parseCandidates(await response.json()));
      setSearchState("idle");
    } catch {
      setSearchState("error");
    }
  };

  const useGps = () => {
    if (!navigator.geolocation) {
      setGpsState("error");
      return;
    }
    setGpsState("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void setPin({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setGpsState("idle");
      },
      () => setGpsState("error"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const copy = async (kind: DeviceKind) => {
    const suggestion = suggestedNames?.[kind];
    if (!suggestion) return;
    try {
      await navigator.clipboard.writeText(suggestion.value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      // Clipboard access can be blocked by the browser; the name remains visible to copy manually.
    }
  };

  const selectTab = (kind: DeviceKind) => setActiveKind(kind);

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, kind: DeviceKind) => {
    if (!(["ArrowLeft", "ArrowRight", "Home", "End"] as string[]).includes(event.key)) return;
    event.preventDefault();
    const nextKind: DeviceKind =
      event.key === "Home"
        ? "repeater"
        : event.key === "End"
          ? "observer"
          : kind === "repeater"
            ? "observer"
            : "repeater";
    setActiveKind(nextKind);
    document.getElementById(`naming-${nextKind}-tab`)?.focus();
  };

  return (
    <section
      className="not-prose mb-8 overflow-hidden rounded-2xl border bg-card/70 shadow-sm"
      aria-labelledby="naming-location-helper-title"
    >
      <header className="border-b px-5 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <RiMapPinLine className="size-4" aria-hidden />
          </span>
          <div>
            <h2 id="naming-location-helper-title" className="text-base font-bold">
              Vietovės ir vardo pagalbininkas
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Pažymėkite vietą, patikslinkite vietovę ir nukopijuokite paruoštą vardą.
            </p>
          </div>
        </div>
      </header>

      <div className="relative h-[clamp(32rem,68vh,46rem)] border-b">
        <MapLibre
          ref={mapRef}
          initialViewState={{
            longitude: defaultCoordinates.longitude,
            latitude: defaultCoordinates.latitude,
            zoom: 7.2,
          }}
          maxBounds={lithuaniaBounds}
          mapStyle={mapStyle(theme)}
          interactiveLayerIds={["naming-location-pin"]}
          cursor="crosshair"
          onClick={(event) => {
            void setPin({ latitude: event.lngLat.lat, longitude: event.lngLat.lng });
          }}
        >
          {coordinates ? <PinSource coordinates={coordinates} /> : null}
        </MapLibre>

        <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-3 sm:inset-x-4 sm:top-4">
          <form
            onSubmit={submitSearch}
            className="pointer-events-auto w-full max-w-md overflow-hidden rounded-xl border bg-background/95 shadow-md backdrop-blur-sm"
          >
            <label className="sr-only" htmlFor="naming-location-search">
              Ieškoti vietovės
            </label>
            <div className="flex h-10">
              <input
                id="naming-location-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Ieškoti vietovės, pvz., Žvėrynas"
                className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!search.trim() || searchState === "loading"}
                aria-label="Ieškoti vietovės"
                className="h-full w-11 rounded-none border-0 border-l border-primary-foreground/20"
              >
                <RiSearchLine aria-hidden />
              </Button>
            </div>
          </form>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="pointer-events-auto shrink-0 bg-background/95 shadow-md backdrop-blur-sm"
            onClick={useGps}
            disabled={gpsState === "loading"}
          >
            <RiFocus3Line aria-hidden /> {gpsState === "loading" ? "Nustatoma…" : "Mano vieta"}
          </Button>
        </div>

        <div className="pointer-events-none absolute left-3 top-16 z-10 w-[min(24rem,calc(100%-1.5rem))] sm:left-4 sm:top-20 sm:w-[min(28rem,calc(100%-8rem))]">
          <div className="pointer-events-auto" aria-live="polite">
            {searchState === "error" ? (
              <p className="flex gap-2 rounded-xl border border-destructive/30 bg-background/95 px-3 py-2.5 text-sm text-destructive shadow-md backdrop-blur-sm">
                <RiCloseLine className="mt-0.5 size-4 shrink-0" aria-hidden />
                Nepavyko atlikti paieškos. Patikrinkite ryšį ir bandykite dar kartą.
              </p>
            ) : null}
            {candidates.length > 0 ? (
              <div className="overflow-hidden rounded-xl border bg-background/95 shadow-md backdrop-blur-sm">
                <p className="border-b bg-muted/60 px-3 py-2 text-xs font-semibold text-muted-foreground">
                  Pasirinkite tiksliausią rezultatą
                </p>
                <div className="max-h-56 overflow-y-auto">
                  {candidates.map((candidate) => (
                    <button
                      key={candidate.id}
                      type="button"
                      onClick={() => chooseCandidate(candidate)}
                      className="block w-full border-b px-3 py-2.5 text-left text-sm transition-colors last:border-b-0 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                    >
                      <span className="block font-medium">
                        {candidate.localities[0]?.value ?? candidate.label}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {candidate.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {hasSearched && searchState === "idle" && candidates.length === 0 ? (
              <p className="rounded-xl border border-dashed bg-background/95 px-3 py-2.5 text-sm text-muted-foreground shadow-md backdrop-blur-sm">
                Pagal šią užklausą vietovių nerasta. Pabandykite tikslesnį pavadinimą arba
                pažymėkite vietą žemėlapyje.
              </p>
            ) : null}
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-3 bottom-11 z-10 sm:inset-x-4 sm:bottom-12">
          <div className="w-full max-w-xl" aria-live="polite">
            {gpsState === "error" ? (
              <p className="flex gap-2 rounded-xl border border-destructive/30 bg-background/95 px-3 py-2.5 text-sm text-destructive shadow-md backdrop-blur-sm">
                <RiCloseLine className="mt-0.5 size-4 shrink-0" aria-hidden />
                Vietos nustatyti nepavyko. Leiskite naršyklei naudoti vietovę arba pažymėkite tašką
                ranka.
              </p>
            ) : null}
            {locationError ? (
              <p className="mt-2 flex gap-2 rounded-xl border border-destructive/30 bg-background/95 px-3 py-2.5 text-sm text-destructive shadow-md backdrop-blur-sm">
                <RiCloseLine className="mt-0.5 size-4 shrink-0" aria-hidden />
                {locationError}
              </p>
            ) : null}
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10 flex items-end justify-between gap-3 text-xs sm:inset-x-4 sm:bottom-4">
          <output className="rounded-md bg-background/95 px-2 py-1 font-mono tabular-nums shadow-sm">
            {coordinates
              ? `${coordinates.latitude.toFixed(5)}, ${coordinates.longitude.toFixed(5)}`
              : "Pasirinkite vietą"}
          </output>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <div className="max-w-4xl">
          <fieldset aria-describedby="naming-locality-guidance">
            <legend className="text-sm font-bold tracking-tight">Vietovė</legend>
            <p id="naming-locality-guidance" className="mt-1 text-sm text-muted-foreground">
              Pasirinkite vieną vietovės lygį pagal pažymėtą tašką arba įrašykite pavadinimą ranka.
            </p>

            {localityState === "loading" ? (
              <p className="mt-3 border-l-2 border-primary pl-3 text-sm" aria-live="polite">
                Nustatomi vietovės lygiai…
              </p>
            ) : null}

            {localityState === "success" && localities.length > 0 ? (
              <div className="mt-3 max-w-2xl divide-y border-y">
                {localities.map((locality, index) => {
                  const id = `naming-locality-${index}`;
                  return (
                    <label
                      key={`${locality.level}-${locality.value}`}
                      htmlFor={id}
                      className="flex cursor-pointer items-center gap-3 py-2.5 text-sm transition-colors hover:bg-muted/60 focus-within:bg-muted/60"
                    >
                      <input
                        id={id}
                        type="radio"
                        name="naming-locality"
                        value={locality.value}
                        checked={selectedLocality === `${locality.level}:${locality.value}`}
                        onChange={() => {
                          setSelectedLocality(`${locality.level}:${locality.value}`);
                          setPlace(locality.value);
                        }}
                        className="ml-0.5 size-4 shrink-0 accent-primary"
                      />
                      <span className="min-w-0 flex-1 font-medium">{locality.value}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {localityLevelLabels[locality.level]}
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : null}

            {coordinates && localityState === "success" && localities.length === 0 ? (
              <p className="mt-3 border-l-2 border-muted-foreground/40 pl-3 text-sm text-muted-foreground">
                Šiam taškui vietovės lygių nerasta. Įrašykite pavadinimą ranka.
              </p>
            ) : null}

            {localityState === "error" ? (
              <p className="mt-3 border-l-2 border-destructive pl-3 text-sm text-destructive">
                Vietovės lygių nustatyti nepavyko. Įrašykite pavadinimą ranka.
              </p>
            ) : null}
          </fieldset>

          <div className="mt-5 grid gap-4 border-t pt-5 md:grid-cols-[minmax(0,1fr)_8rem_minmax(12rem,0.48fr)] md:items-start">
            <div>
              <label className="text-sm font-semibold" htmlFor="naming-location-place">
                Vietovės pavadinimas
              </label>
              <input
                id="naming-location-place"
                value={place}
                onChange={(event) => {
                  setPlace(event.target.value);
                  setSelectedLocality(null);
                }}
                placeholder="Pvz., Žvėrynas"
                aria-invalid={hasPlaceError}
                aria-describedby="naming-location-place-hint"
                className="mt-2 h-10 w-full border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              <p id="naming-location-place-hint" className="mt-1.5 text-xs text-muted-foreground">
                Pasirinkus lygį jo pavadinimas perkeliamas čia; šį lauką galite bet kada pakeisti.
              </p>
            </div>
            <div>
              <label className="text-sm font-semibold" htmlFor="naming-location-id">
                ID <span className="font-normal text-muted-foreground">(2 hex)</span>
              </label>
              <input
                id="naming-location-id"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="FF"
                maxLength={2}
                autoCapitalize="characters"
                spellCheck={false}
                aria-invalid={hasIdentifierError}
                aria-describedby="naming-location-id-hint"
                className="mt-2 h-10 w-full border bg-background px-3 font-mono text-sm uppercase outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              <p
                id="naming-location-id-hint"
                className={cn(
                  "mt-1.5 text-xs",
                  hasIdentifierError ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {hasIdentifierError
                  ? "Naudokite 0–9 arba A–F."
                  : cleanIdentifier
                    ? "Bendras abiem vardams."
                    : "Nustačius vietą: FF."}
              </p>
            </div>
            <div>
              <label className="text-sm font-semibold" htmlFor="naming-location-direction">
                Kryptis <span className="font-normal text-muted-foreground">(nebūtina)</span>
              </label>
              <select
                id="naming-location-direction"
                value={direction}
                onChange={(event) => setDirection(event.target.value)}
                className="mt-2 h-10 w-full border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {directions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Pridedama tik retransliatoriui.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t bg-muted/30 px-5 py-5 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <RiCompass3Line className="mt-0.5 size-4 text-primary" aria-hidden />
              <div>
                <h3 className="text-sm font-bold tracking-tight">Paruoštas vardas</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {canGenerate
                    ? `Kodas ${code} parinktas pagal pažymėtą vietą. Vardas atnaujinamas automatiškai.`
                    : "Pažymėkite vietą ir įrašykite vietovę, kad sugeneruotume vardą."}
                </p>
              </div>
            </div>
            {suggestedNames ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium tabular-nums",
                  activeSuggestion?.fits
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "border-destructive/30 bg-destructive/10 text-destructive",
                )}
              >
                <span>
                  {activeSuggestion?.bytes ?? 0} / {maxLocatedNodeNameBytes} baitų
                </span>
                <span aria-hidden="true">·</span>
                <span>{activeSuggestion?.fits ? "telpa" : "viršija"}</span>
              </span>
            ) : null}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-[auto_minmax(0,1fr)] md:items-center">
            <div
              className="inline-flex w-fit border bg-background p-1"
              role="tablist"
              aria-label="Įrenginio tipas"
            >
              {(Object.keys(tabLabels) as DeviceKind[]).map((kind) => {
                const selected = activeKind === kind;
                return (
                  <button
                    key={kind}
                    id={`naming-${kind}-tab`}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-controls={`naming-${kind}-panel`}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => selectTab(kind)}
                    onKeyDown={(event) => onTabKeyDown(event, kind)}
                    className={cn(
                      "px-3 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                      selected
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {tabLabels[kind]}
                  </button>
                );
              })}
            </div>

            <div>
              {(Object.keys(tabLabels) as DeviceKind[]).map((kind) => {
                const suggestion = suggestedNames?.[kind];
                return (
                  <div
                    key={kind}
                    id={`naming-${kind}-panel`}
                    role="tabpanel"
                    aria-labelledby={`naming-${kind}-tab`}
                    hidden={activeKind !== kind}
                    className="flex min-h-12 items-center gap-2 border bg-background px-3 py-2.5"
                  >
                    <output className="min-w-0 flex-1 break-words font-mono text-sm font-medium leading-6">
                      {suggestion?.value ?? "Vardas bus rodomas čia"}
                    </output>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      disabled={!suggestion?.fits}
                      onClick={() => copy(kind)}
                      aria-label={`${tabLabels[kind]}: kopijuoti vardą`}
                    >
                      {copied === kind ? (
                        <RiCheckLine className="text-emerald-600" aria-hidden />
                      ) : (
                        <RiFileCopyLine aria-hidden />
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          {activeNeedsShortening ? (
            <div className="mt-4 border-t pt-4" aria-live="polite">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="text-sm font-semibold text-destructive">
                  {tabLabels[activeKind]} vardas viršija {maxLocatedNodeNameBytes} UTF-8 baitus.
                </p>
                <p className="text-xs text-muted-foreground">
                  Pasirinkite trumpesnę vietovę; vardas pakeičiamas tik pasirinkus variantą.
                </p>
              </div>
              {shorteningOptions.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {shorteningOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setPlace(option.value);
                        setSelectedLocality(null);
                      }}
                      aria-label={`Pasirinkti vietovę „${option.value}“ ${tabLabels[activeKind]} vardui`}
                      className="rounded-lg border bg-background px-2.5 py-2 text-left text-xs transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <span className="block font-medium text-foreground">{option.value}</span>
                      <span className="mt-0.5 block text-muted-foreground">
                        {localityOptionDescription(option)} · {tabLabels[activeKind]}{" "}
                        {option.suggestions[activeKind].bytes}/{maxLocatedNodeNameBytes} baitų
                        · telpa
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  Šio pavadinimo automatiškai sutrumpinti nepavyko. Įrašykite trumpesnį vietovės
                  pavadinimą.
                </p>
              )}
            </div>
          ) : null}
          <p className="sr-only" aria-live="polite">
            {copied ? "Vardas nukopijuotas į iškarpinę." : ""}
          </p>
        </div>
      </div>
    </section>
  );
}
