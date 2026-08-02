export const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
export const maxLocatedNodeNameBytes = 24;

export type NamingCode = string;
export type Direction = (typeof directions)[number];
export type DeviceKind = "repeater" | "observer";

export type NameSuggestion = {
  value: string;
  bytes: number;
  fits: boolean;
};

export type LocalityOption = {
  value: string;
  strategy:
    | "original"
    | "without-descriptor"
    | "abbreviated"
    | "transliterated"
    | "transliterated-abbreviated"
    | "shortened";
  suggestions: Record<DeviceKind, NameSuggestion>;
};

export function normalizeIdentifier(value: string) {
  return value.trim().toUpperCase();
}

export function isRepeaterIdentifier(value: string) {
  return /^[0-9A-F]{2}$/.test(value);
}

export function utf8Bytes(value: string) {
  return new TextEncoder().encode(value).byteLength;
}

function nameSuggestion(value: string): NameSuggestion {
  const bytes = utf8Bytes(value);
  return { value, bytes, fits: bytes <= maxLocatedNodeNameBytes };
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
}): Record<DeviceKind, NameSuggestion> {
  const normalizedPlace = place.trim().normalize("NFC");
  const normalizedIdentifier = normalizeIdentifier(identifier);
  const repeater = [`LT-${code}`, normalizedPlace, normalizedIdentifier, direction]
    .filter(Boolean)
    .join(" ");
  const observer = `LT-${code} ${normalizedPlace} ${normalizedIdentifier} OBS`;

  return { repeater: nameSuggestion(repeater), observer: nameSuggestion(observer) };
}

function abbreviateWord(word: string) {
  const firstCharacter = Array.from(word)[0];
  return firstCharacter ? `${firstCharacter}.` : word;
}

function transliterateLithuanian(value: string) {
  const replacements: Record<string, string> = {
    Ą: "A",
    ą: "a",
    Č: "C",
    č: "c",
    Ę: "E",
    ę: "e",
    Ė: "E",
    ė: "e",
    Į: "I",
    į: "i",
    Š: "S",
    š: "s",
    Ų: "U",
    ų: "u",
    Ū: "U",
    ū: "u",
    Ž: "Z",
    ž: "z",
  };

  return Array.from(value, (character) => replacements[character] ?? character).join("");
}

function shortenWord(word: string) {
  const characters = Array.from(word);
  if (characters.length <= 4) return abbreviateWord(word);
  return `${characters.slice(0, 4).join("")}.`;
}

function truncateToBytes(value: string, budget: number) {
  let result = "";
  for (const character of Array.from(value)) {
    if (utf8Bytes(`${result}${character}.`) > budget) break;
    result += character;
  }
  return result && result !== value ? `${result}.` : result;
}

function localityAlternatives(
  value: string,
  transliterated = false,
): Array<[string, LocalityOption["strategy"]]> {
  const normalized = value.trim().replace(/\s+/g, " ").normalize("NFC");
  const alternatives: Array<[string, LocalityOption["strategy"]]> = [
    [normalized, transliterated ? "transliterated" : "original"],
  ];
  const withoutDescriptor = normalized.replace(
    /\s+(?:miestas|miestelis|kaimas|gyvenvietė|seniūnija)$/iu,
    "",
  );
  if (withoutDescriptor !== normalized)
    alternatives.push([
      withoutDescriptor,
      transliterated ? "transliterated" : "without-descriptor",
    ]);

  const words = withoutDescriptor.split(" ");
  for (let count = 1; count < words.length; count += 1) {
    alternatives.push([
      [...words.slice(0, count).map(abbreviateWord), ...words.slice(count)].join(" "),
      transliterated ? "transliterated-abbreviated" : "abbreviated",
    ]);
  }

  if (words.length > 1) {
    alternatives.push([
      [...words.slice(0, -1).map(abbreviateWord), shortenWord(words.at(-1) ?? "")].join(" "),
      transliterated ? "transliterated-abbreviated" : "abbreviated",
    ]);
  }

  const ascii = transliterateLithuanian(normalized);
  return ascii === normalized
    ? alternatives
    : [...alternatives, ...localityAlternatives(ascii, true)];
}

export function suggestLocalityOptions({
  code,
  locality,
  identifier,
  direction,
}: {
  code: NamingCode;
  locality: string;
  identifier: string;
  direction?: Direction;
}): LocalityOption[] {
  const options = localityAlternatives(locality)
    .map(([value, strategy]) => ({
      value,
      strategy,
      suggestions: createSuggestedNames({ code, place: value, identifier, direction }),
    }))
    .filter((option) => option.suggestions.repeater.fits && option.suggestions.observer.fits);

  if (options.length > 0) {
    return options.filter(
      (option, index, all) =>
        all.findIndex((candidate) => candidate.value === option.value) === index,
    );
  }

  const fixedBytes = Math.max(
    utf8Bytes(`LT-${code}  ${normalizeIdentifier(identifier)}${direction ? ` ${direction}` : ""}`),
    utf8Bytes(`LT-${code}  ${normalizeIdentifier(identifier)} OBS`),
  );
  const normalizedLocality = locality.trim().normalize("NFC");
  const shortened = truncateToBytes(
    transliterateLithuanian(normalizedLocality),
    maxLocatedNodeNameBytes - fixedBytes,
  );
  if (!shortened) return [];

  const suggestions = createSuggestedNames({ code, place: shortened, identifier, direction });
  return suggestions.repeater.fits && suggestions.observer.fits
    ? [{ value: shortened, strategy: "shortened", suggestions }]
    : [];
}
