"use client";

import { findCodeFromAddress, findCountyCode, isWithinLithuania } from "@/lib/naming/boundaries";
import {
  type Direction,
  type NamingCode,
  createSuggestedNames,
  isRepeaterIdentifier,
  normalizeIdentifier,
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
import {
  MapLayer,
  type MapLayerMouseEvent,
  MapLibre,
  type MapRef,
  MapSource,
} from "@workspace/map";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { useTheme } from "next-themes";
import { useMemo, useRef, useState } from "react";

type Coordinates = { latitude: number; longitude: number };

type PlaceCandidate = {
  id: string;
  label: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: Record<string, string | undefined>;
};

type SearchResponse = {
  data?: unknown;
};

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

const defaultCoordinates: Coordinates = { latitude: 54.6872, longitude: 25.2797 };
const lithuaniaBounds = [
  [19.5, 53.2],
  [28.0, 57.2],
] as [[number, number], [number, number]];

function mapStyle(theme: string | undefined) {
  return `https://basemaps.cartocdn.com/gl/${theme === "light" ? "voyager-gl-style" : "dark-matter-gl-style"}/style.json`;
}

function nameFromResult(result: Record<string, unknown>) {
  const address = result.address as Record<string, unknown> | undefined;
  const localName =
    address?.suburb ?? address?.city_district ?? address?.village ?? address?.town ?? address?.city;
  return typeof localName === "string"
    ? localName
    : (String(result.name ?? result.display_name ?? "").split(",")[0] ?? "");
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
    const latitude = Number(result.latitude ?? result.lat);
    const longitude = Number(result.longitude ?? result.lon ?? result.lng);
    const label = String(result.display_name ?? result.label ?? result.name ?? "");
    const name = nameFromResult(result).trim();
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !label || !name) return [];
    const address =
      result.address && typeof result.address === "object"
        ? Object.fromEntries(
            Object.entries(result.address as Record<string, unknown>).flatMap(([key, value]) =>
              typeof value === "string" ? [[key, value]] : [],
            ),
          )
        : undefined;
    return [
      {
        id: String(result.id ?? result.place_id ?? index),
        label,
        name,
        latitude,
        longitude,
        address,
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

export function NamingLocationHelper() {
  const { theme } = useTheme();
  const mapRef = useRef<MapRef>(null);
  const selectionRevision = useRef(0);
  const lastValidCoordinates = useRef<Coordinates | null>(null);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [search, setSearch] = useState("");
  const [candidates, setCandidates] = useState<PlaceCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<PlaceCandidate | null>(null);
  const [code, setCode] = useState<NamingCode | null>(null);
  const [place, setPlace] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [direction, setDirection] = useState("");
  const [repeaterName, setRepeaterName] = useState("");
  const [observerName, setObserverName] = useState("");
  const [searchState, setSearchState] = useState<"idle" | "loading" | "error">("idle");
  const [hasSearched, setHasSearched] = useState(false);
  const [gpsState, setGpsState] = useState<"idle" | "loading" | "error">("idle");
  const [locationError, setLocationError] = useState("");
  const [copied, setCopied] = useState<"repeater" | "observer" | null>(null);

  const cleanIdentifier = normalizeIdentifier(identifier);
  const hasIdentifierError = Boolean(identifier) && !isRepeaterIdentifier(cleanIdentifier);
  const hasPlaceError = Boolean(selectedCandidate || place) && !place.trim();
  const canGenerate = Boolean(
    code && coordinates && place.trim() && isRepeaterIdentifier(cleanIdentifier),
  );
  const suggestedNames = useMemo(
    () =>
      canGenerate
        ? createSuggestedNames({
            code: code as NamingCode,
            place,
            identifier: cleanIdentifier,
            direction: direction as Direction | undefined,
          })
        : null,
    [canGenerate, cleanIdentifier, code, direction, place],
  );
  const generatedRepeater = suggestedNames?.repeater ?? "";
  const generatedObserver = suggestedNames?.observer ?? "";
  const visibleRepeater = repeaterName || generatedRepeater;
  const visibleObserver = observerName || generatedObserver;

  const setPin = async (nextCoordinates: Coordinates, candidate?: PlaceCandidate) => {
    const revision = ++selectionRevision.current;
    setLocationError("");
    if (!candidate) {
      setSelectedCandidate(null);
      setCandidates([]);
      setPlace("");
    }
    // Show an immediate selection response; validation below removes it if it is outside Lithuania.
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
        }
        return;
      }

      const countyCode = await findCountyCode(nextCoordinates);
      if (revision !== selectionRevision.current) return;
      if (!countyCode) {
        setCoordinates(lastValidCoordinates.current);
        setLocationError("Nepavyko nustatyti vietovės apskrities.");
        return;
      }

      lastValidCoordinates.current = nextCoordinates;
      setCode(
        candidate?.address ? (findCodeFromAddress(candidate.address) ?? countyCode) : countyCode,
      );

      if (candidate) {
        setSelectedCandidate(candidate);
        setPlace(candidate.name);
        setCandidates([]);
        setHasSearched(false);
        setSearch(candidate.label);
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
        return;
      }

      const reverseCandidates = parseCandidates(await response.json());
      if (revision !== selectionRevision.current) return;
      const selected = reverseCandidates[0];
      if (selected?.address) setCode(findCodeFromAddress(selected.address) ?? countyCode);
      if (!candidate && selected) {
        setSelectedCandidate(selected);
        setPlace(selected.name);
        setCandidates(reverseCandidates);
      }
    } catch {
      if (revision === selectionRevision.current) {
        setLocationError("Nepavyko patikrinti vietos. Bandykite dar kartą.");
      }
    }
  };

  const chooseCandidate = (candidate: PlaceCandidate) => {
    void setPin({ latitude: candidate.latitude, longitude: candidate.longitude }, candidate);
  };

  const submitSearch = async (event: React.FormEvent<HTMLFormElement>) => {
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
        const nextCoordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        void setPin(nextCoordinates);
        setGpsState("idle");
      },
      () => setGpsState("error"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const copy = async (value: string, target: "repeater" | "observer") => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(target);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      // The visible, editable field remains a usable fallback when clipboard access is blocked.
    }
  };

  const resetOutput = (target: "repeater" | "observer") => {
    if (target === "repeater") setRepeaterName("");
    else setObserverName("");
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
              Pažymėkite vietą, pasirinkite vietovę ir gaukite paruoštą įrenginio vardą.
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
                <span className="sr-only">Ieškoti</span>
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
                      <span className="block font-medium">{candidate.name}</span>
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
                Pagal šią užklausą vietovių nerasta. Pabandykite tikslesnį pavadinimą arba įrašykite
                jį ranka.
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
          <a
            className="pointer-events-auto rounded-md bg-background/95 px-2 py-1 underline underline-offset-2 shadow-sm"
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
          >
            © OpenStreetMap contributors
          </a>
        </div>
      </div>

      <div className="grid gap-5 p-5 sm:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)] sm:p-6">
        <div>
          <label className="text-sm font-bold" htmlFor="naming-location-place">
            Vietovės pavadinimas
          </label>
          <input
            id="naming-location-place"
            value={place}
            onChange={(event) => {
              setPlace(event.target.value);
              setSelectedCandidate(null);
            }}
            placeholder="Pvz., Žvėrynas"
            aria-invalid={hasPlaceError}
            className="mt-2 h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            {selectedCandidate
              ? "Parinktas pavadinimas gali būti pataisytas prieš kopijuojant."
              : "Paieškos rezultatą pasirinkite arba įrašykite vietovę patys."}
          </p>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-3">
          <div>
            <label className="text-sm font-bold" htmlFor="naming-location-id">
              4 simbolių ID
            </label>
            <input
              id="naming-location-id"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="7F2A"
              autoCapitalize="characters"
              spellCheck={false}
              aria-invalid={hasIdentifierError}
              aria-describedby="naming-location-id-hint"
              className="mt-2 h-9 w-full rounded-lg border bg-background px-3 font-mono text-sm uppercase outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <p
              id="naming-location-id-hint"
              className={cn(
                "mt-1.5 text-xs",
                hasIdentifierError ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {hasIdentifierError ? "Reikia 4 simbolių: 0–9, A–F." : "Public Key pradžia."}
            </p>
          </div>
          <div>
            <label className="text-sm font-bold" htmlFor="naming-location-direction">
              Kryptis
            </label>
            <select
              id="naming-location-direction"
              value={direction}
              onChange={(event) => setDirection(event.target.value)}
              className="mt-2 h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {directions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-muted-foreground">Retransliatoriui neprivaloma.</p>
          </div>
        </div>
      </div>

      <div className="border-t bg-muted/20 px-5 py-5 sm:px-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <RiCompass3Line className="size-4 text-primary" aria-hidden />
          <h3 className="text-sm font-bold">Paruošti vardai</h3>
          <span className="text-xs text-muted-foreground">
            {canGenerate
              ? `Kodas ${code} nustatytas pagal pažymėtą vietą. Galite koreguoti prieš kopijuodami.`
              : "Įrašykite vietovę ir 4 simbolių ID."}
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {(
            [
              ["repeater", "Retransliatorius", visibleRepeater, setRepeaterName],
              ["observer", "Stebėtojas", visibleObserver, setObserverName],
            ] as const
          ).map(([key, label, value, setValue]) => (
            <div key={key} className="rounded-xl border bg-background p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <label
                  className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  htmlFor={`naming-${key}-output`}
                >
                  {label}
                </label>
                <button
                  type="button"
                  onClick={() => resetOutput(key)}
                  disabled={!value || !(key === "repeater" ? repeaterName : observerName)}
                  className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:no-underline disabled:opacity-40"
                >
                  Atkurti
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  id={`naming-${key}-output`}
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  placeholder="LT-VM Vietovė 7F2A"
                  disabled={!canGenerate && !value}
                  className="h-9 min-w-0 flex-1 rounded-lg border bg-muted/30 px-2.5 font-mono text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
                />
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  disabled={!value}
                  onClick={() => copy(value, key)}
                  aria-label={`${label}: kopijuoti vardą`}
                >
                  {copied === key ? (
                    <RiCheckLine className="text-emerald-600" aria-hidden />
                  ) : (
                    <RiFileCopyLine aria-hidden />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
        <p className="sr-only" aria-live="polite">
          {copied ? "Vardas nukopijuotas į iškarpinę." : ""}
        </p>
      </div>
    </section>
  );
}
