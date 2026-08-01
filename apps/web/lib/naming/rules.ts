export const namingScopes = [
  { county: "Alytaus apskritis", countyCode: "AA", city: "Alytaus miestas", cityCode: "AM" },
  { county: "Kauno apskritis", countyCode: "KA", city: "Kauno miestas", cityCode: "KM" },
  { county: "Klaipėdos apskritis", countyCode: "LA", city: "Klaipėdos miestas", cityCode: "LM" },
  {
    county: "Marijampolės apskritis",
    countyCode: "MA",
    city: "Marijampolės miestas",
    cityCode: "MM",
  },
  { county: "Panevėžio apskritis", countyCode: "PA", city: "Panevėžio miestas", cityCode: "PM" },
  { county: "Šiaulių apskritis", countyCode: "SA", city: "Šiaulių miestas", cityCode: "SM" },
  { county: "Tauragės apskritis", countyCode: "TA", city: "Tauragės miestas", cityCode: "TM" },
  { county: "Telšių apskritis", countyCode: "EA", city: "Telšių miestas", cityCode: "EM" },
  { county: "Utenos apskritis", countyCode: "UA", city: "Utenos miestas", cityCode: "UM" },
  { county: "Vilniaus apskritis", countyCode: "VA", city: "Vilniaus miestas", cityCode: "VM" },
] as const;

export const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;

export type NamingCode =
  | (typeof namingScopes)[number]["countyCode"]
  | (typeof namingScopes)[number]["cityCode"];
export type Direction = (typeof directions)[number];

export function normalizeIdentifier(value: string) {
  return value.trim().toUpperCase();
}

export function isRepeaterIdentifier(value: string) {
  return /^[0-9A-F]{4}$/.test(value);
}

export function createSuggestedNames({
  code,
  place,
  identifier,
  direction,
}: {
  code: NamingCode;
  place: string;
  identifier: string;
  direction?: Direction;
}) {
  const base = `LT-${code} ${place.trim()} ${normalizeIdentifier(identifier)}`;

  return {
    repeater: [base, direction].filter(Boolean).join(" "),
    observer: `LT-${code} ${place.trim()} ${normalizeIdentifier(identifier).slice(0, 2)} OBS`,
  };
}
