export type GeocodeResult = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  localities: GeocodeLocality[];
};

export type GeocodeLocality = {
  value: string;
  level: "neighbourhood" | "suburb" | "city_district" | "hamlet" | "village" | "town" | "city";
};

type NominatimResult = {
  osm_id?: number;
  osm_type?: string;
  display_name?: string;
  name?: string;
  lat?: string;
  lon?: string;
  address?: Record<string, unknown>;
};

const localityLevels = [
  "neighbourhood",
  "suburb",
  "city_district",
  "hamlet",
  "village",
  "town",
  "city",
] as const satisfies GeocodeLocality["level"][];

function localitiesFromAddress(address: Record<string, string | undefined>): GeocodeLocality[] {
  const seen = new Set<string>();

  return localityLevels.flatMap((level) => {
    const value = address[level]?.trim().replace(/\s+/g, " ").normalize("NFC");
    if (!value) return [];

    const key = value.toLocaleLowerCase("lt-LT");
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ value, level }];
  });
}

function toResult(result: NominatimResult): GeocodeResult | null {
  const latitude = Number(result.lat);
  const longitude = Number(result.lon);
  const label = result.display_name?.trim();

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !label || !result.osm_id) {
    return null;
  }

  const address = Object.fromEntries(
    Object.entries(result.address ?? {}).flatMap(([key, value]) =>
      typeof value === "string" ? [[key, value]] : [],
    ),
  );

  return {
    id: `${result.osm_type ?? "N"}${result.osm_id}`,
    label,
    latitude,
    longitude,
    localities: localitiesFromAddress(address),
  };
}

export function createSearchUrl(query: string) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.search = new URLSearchParams({
    q: query,
    format: "jsonv2",
    addressdetails: "1",
    limit: "5",
    countrycodes: "lt",
    "accept-language": "lt",
  }).toString();
  return url.toString();
}

export function createReverseUrl(latitude: number, longitude: number) {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.search = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    format: "jsonv2",
    addressdetails: "1",
    zoom: "16",
    "accept-language": "lt",
  }).toString();
  return url.toString();
}

export function parseSearchResponse(value: unknown) {
  return Array.isArray(value)
    ? value.flatMap((item) => {
        const result = toResult(item as NominatimResult);
        return result ? [result] : [];
      })
    : [];
}

export function parseReverseResponse(value: unknown) {
  const result = toResult(value as NominatimResult);
  return result ? [result] : [];
}
