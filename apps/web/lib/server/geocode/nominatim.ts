export type GeocodeResult = {
  id: string;
  label: string;
  name: string;
  latitude: number;
  longitude: number;
  address: Record<string, string | undefined>;
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
    name:
      result.name?.trim() ||
      address.neighbourhood ||
      address.suburb ||
      address.village ||
      address.town ||
      address.city ||
      label.split(",")[0] ||
      label,
    latitude,
    longitude,
    address,
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
