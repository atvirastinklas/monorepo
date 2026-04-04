"use client";

import { type ReactNode, useMemo, useState } from "react";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

const codeLabels = {
  AA: "Alytaus apskritis",
  AM: "Alytaus miestas",
  EA: "Telšių apskritis",
  EM: "Telšių miestas",
  KA: "Kauno apskritis",
  KM: "Kauno miestas",
  LA: "Klaipėdos apskritis",
  LM: "Klaipėdos miestas",
  MA: "Marijampolės apskritis",
  MM: "Marijampolės miestas",
  PA: "Panevėžio apskritis",
  PM: "Panevėžio miestas",
  SA: "Šiaulių apskritis",
  SM: "Šiaulių miestas",
  TA: "Tauragės apskritis",
  TM: "Tauragės miestas",
  UA: "Utenos apskritis",
  UM: "Utenos miestas",
  VA: "Vilniaus apskritis",
  VM: "Vilniaus miestas",
} as const;

const directionLabels = {
  N: "Šiaurė",
  NE: "Šiaurės rytai",
  E: "Rytai",
  SE: "Pietryčiai",
  S: "Pietūs",
  SW: "Pietvakariai",
  W: "Vakarai",
  NW: "Šiaurės vakarai",
} as const;

const validCodes = Object.keys(codeLabels) as Array<keyof typeof codeLabels>;
const validDirections = Object.keys(directionLabels) as Array<keyof typeof directionLabels>;

const exampleNames = ["VM Žvėrynas 6D SE", "KM Šilainiai II 12", "VM Šiaurės m. 56 S"] as const;

const namingFormat = "{Kodas} {Vietovė} {ID} [Kryptis]";
const placeTokenPattern = "[0-9A-Za-zĄČĘĖĮŠŲŪŽąčęėįšųūž]+\\.?";
const placePattern = new RegExp(`^${placeTokenPattern}(?:\\s+${placeTokenPattern})*$`, "u");
const idPattern = /^(?:[0-9A-F]{2}){1,3}$/;

const validCodeDetails = validCodes.map((code) => `${code}: ${codeLabels[code]}`).join(", ");
const validDirectionDetails = validDirections
  .join(", ");

type ValidationState = "idle" | "valid" | "invalid";
type PartKey = "code" | "place" | "id" | "direction";

type PartValidation = {
  label: string;
  value: string;
  state: ValidationState;
  description: string;
  details?: string;
};

type ValidationResult = {
  formatMessage: ReactNode;
  formatDetails?: string;
  isValid: boolean;
  hasNormalizationChange: boolean;
  normalizedValue: string;
  parts: Record<PartKey, PartValidation>;
};

function validateRepeaterName(input: string): ValidationResult {
  const value = input.trim();
  const tokenMatches = Array.from(value.matchAll(/\S+/g));
  const codeRaw = tokenMatches[0]?.[0] ?? "";
  const restMatches = tokenMatches.slice(1);
  const lastRestMatch = restMatches.at(-1);
  const directionCandidate = lastRestMatch?.[0].toUpperCase() ?? "";
  const hasDirection = validDirections.includes(directionCandidate as (typeof validDirections)[number]);
  const idMatch = restMatches.at(hasDirection ? -2 : -1);
  const placeStart = restMatches[0]?.index;
  const placeEnd = idMatch?.index;
  const placeRaw =
    placeStart !== undefined && placeEnd !== undefined ? value.slice(placeStart, placeEnd).trim() : "";
  const idRaw = idMatch?.[0] ?? "";
  const directionRaw = hasDirection ? lastRestMatch?.[0] ?? "" : "";
  const code = codeRaw.toUpperCase();
  const id = idRaw.toUpperCase();
  const direction = directionRaw.toUpperCase();

  const parts: ValidationResult["parts"] = {
    code: {
      label: "Kodas",
      value: code,
      state: "idle",
      description: "Miesto arba apskrities kodas.",
      details: `Galimi kodai: ${validCodeDetails}.`,
    },
    place: {
      label: "Vietovė",
      value: placeRaw,
      state: "idle",
      description: "Mikrorajonas arba vietovė.",
      details: "Naudokite lietuviškas raides, skaičius ir tarpus. Sutrumpinimams galima naudoti tašką.",
    },
    id: {
      label: "ID",
      value: id,
      state: "idle",
      description: "Public Key pradžia.",
      details: "Naudokite 2, 4 arba 6 šešioliktainius simbolius: 0-9 ir A-F.",
    },
    direction: {
      label: "Kryptis",
      value: direction,
      state: "idle",
      description: "Neprivaloma.",
      details: `Galimos kryptys: ${validDirectionDetails}.`,
    },
  };

  const hasLegacySeparator = value.includes("-");
  const canShowNormalizedValue = Boolean(codeRaw && placeRaw && idRaw);
  const normalizedValue = canShowNormalizedValue
    ? [code, placeRaw, id, direction].filter(Boolean).join(" ")
    : "";
  const hasNormalizationChange = Boolean(normalizedValue) && normalizedValue !== value;

  if (!value) {
    return {
      formatMessage: (
        <>
          Įveskite pavadinimą formatu <code className="font-mono bg-muted/70 px-1.5 py-0.5 rounded-md">{namingFormat}</code>.
        </>
      ),
      isValid: false,
      hasNormalizationChange: false,
      normalizedValue: "",
      parts,
    };
  }

  if (!codeRaw) {
    parts.code = {
      ...parts.code,
      state: "invalid",
      description: "Trūksta kodo.",
    };
  } else if (!validCodes.includes(code as (typeof validCodes)[number])) {
    parts.code = {
      ...parts.code,
      state: "invalid",
      description: "Neatpažintas kodas.",
    };
  } else {
    parts.code = {
      ...parts.code,
      state: "valid",
      description: codeLabels[code as keyof typeof codeLabels],
      details: undefined,
    };
  }

  if (restMatches.length < 2) {
    parts.place = {
      ...parts.place,
      state: "invalid",
      description: "Trūksta vietovės.",
    };
  } else if (!placeRaw) {
    parts.place = {
      ...parts.place,
      state: "invalid",
      description: "Vietovė negali būti tuščia.",
    };
  } else if (!placePattern.test(placeRaw)) {
    parts.place = {
      ...parts.place,
      state: "invalid",
      description: "Netinkamas formatas.",
    };
  } else {
    parts.place = {
      ...parts.place,
      state: "valid",
      description: "Tinkamas vietovės pavadinimas.",
      details: undefined,
    };
  }

  if (restMatches.length < 2) {
    parts.id = {
      ...parts.id,
      state: "invalid",
      description: "Trūksta ID.",
    };
  } else if (!idRaw) {
    parts.id = {
      ...parts.id,
      state: "invalid",
      description: "ID negali būti tuščias.",
    };
  } else if (!idPattern.test(id)) {
    parts.id = {
      ...parts.id,
      state: "invalid",
      description: "Netinkamas ID.",
    };
  } else {
    parts.id = {
      ...parts.id,
      state: "valid",
      description: `${id.length} šešioliktainiai simboliai.`,
      details: undefined,
    };
  }

  if (!directionRaw) {
    parts.direction = {
      ...parts.direction,
      state: "idle",
      description: "Neprivaloma.",
    };
  } else if (!validDirections.includes(direction as (typeof validDirections)[number])) {
    parts.direction = {
      ...parts.direction,
      state: "invalid",
      description: "Neatpažinta kryptis.",
    };
  } else {
    parts.direction = {
      ...parts.direction,
      state: "valid",
      description: directionLabels[direction as keyof typeof directionLabels],
      details: undefined,
    };
  }

  const isValid =
    parts.code.state === "valid" &&
    parts.place.state === "valid" &&
    parts.id.state === "valid" &&
    parts.direction.state !== "invalid";

  let formatMessage = "Pataisykite pažymėtas dalis.";
  let formatDetails: string | undefined;

  if (hasLegacySeparator) {
    formatMessage = "Naudokite tarpus vietoje brūkšnių.";
    formatDetails = "Formatas yra `{Kodas} {Vietovė} {ID} [Kryptis]`, pvz. `VM VM Šiaurės m. 56 S`.";
  } else if (restMatches.length < 2) {
    formatMessage = "Trūksta vienos ar kelių privalomų dalių.";
  } else if (isValid) {
    formatMessage = hasNormalizationChange
      ? "Pavadinimas atitinka formatą po normalizavimo."
      : "Pavadinimas atitinka rekomenduojamą formatą.";
    formatDetails = hasNormalizationChange
      ? "Suvienodintas kodas, ID ir kryptis, taip pat sutvarkyti tarpai tarp dalių."
      : undefined;
  }

  return {
    formatMessage,
    formatDetails,
    isValid,
    hasNormalizationChange,
    normalizedValue,
    parts,
  };
}

function StatusBadge({ state }: { state: ValidationState }) {
  const labels: Record<ValidationState, string> = {
    idle: "Pasirenkama",
    valid: "Gerai",
    invalid: "Klaida",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        state === "valid" &&
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        state === "invalid" && "border-destructive/30 bg-destructive/10 text-destructive",
        state === "idle" && "border-border bg-muted text-muted-foreground",
      )}
    >
      {labels[state]}
    </span>
  );
}

function PartRow({ part }: { part: PartValidation }) {
  return (
    <div className="grid gap-2 px-4 py-3 md:grid-cols-[5.5rem_minmax(0,1fr)]">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {part.label}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0">
          {part.value ? (
            <div className="flex flex-wrap items-center gap-2">
              <code
                className={cn(
                  "rounded-md border px-1.5 py-0.5 text-[0.8rem] font-medium",
                  part.state === "invalid"
                    ? "border-destructive/20 bg-destructive/5 text-destructive"
                    : "border-border bg-muted/70 text-foreground",
                )}
              >
                {part.value}
              </code>
              <p
                className={cn("text-sm leading-5", part.state === "invalid" && "text-destructive")}
              >
                {part.description}
              </p>
            </div>
          ) : (
            <p className={cn("text-sm leading-5", part.state === "invalid" && "text-destructive")}>
              {part.description}
            </p>
          )}
          {part.details ? (
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{part.details}</p>
          ) : null}
        </div>
        <div className="sm:shrink-0">
          <StatusBadge state={part.state} />
        </div>
      </div>
    </div>
  );
}

export function NamingFormatValidator() {
  const [value, setValue] = useState("");
  const result = useMemo(() => validateRepeaterName(value), [value]);

  return (
    <div className="not-prose mb-8 rounded-2xl border bg-card/70 p-5 shadow-sm">
      <div className="flex flex-col gap-3">
        <label className="text-sm font-bold" htmlFor="naming-format-validator">
          Retransliatoriaus pavadinimas
        </label>
        <input
          id="naming-format-validator"
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="VM VM Šiaurės m. 56 S"
          autoCapitalize="characters"
          spellCheck={false}
          aria-describedby="naming-format-validator-hint naming-format-validator-feedback"
          aria-invalid={Boolean(value.trim()) && !result.isValid}
          className={cn(
            "h-11 rounded-xl border bg-background px-3 text-sm outline-none transition-colors",
            "border-input focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          )}
        />
      </div>

      <div
        id="naming-format-validator-feedback"
        className={cn(
          "mt-4 rounded-xl border px-4 py-3 text-sm",
          result.isValid
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
            : "border-border bg-muted/40 text-foreground",
        )}
      >
        <p className="font-medium">{result.formatMessage}</p>
        {result.formatDetails ? (
          <p className="mt-1 text-xs text-muted-foreground">{result.formatDetails}</p>
        ) : null}
        {result.normalizedValue ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {result.hasNormalizationChange ? "Siūloma forma" : "Atpažinta forma"}:{" "}
            <code>{result.normalizedValue}</code>
          </p>
        ) : null}
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border bg-background/80 shadow-sm">
        {Object.entries(result.parts).map(([key, part], index) => (
          <div key={key} className={cn(index > 0 && "border-t")}>
            <PartRow part={part} />
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {exampleNames.map((exampleName) => (
          <Button
            key={exampleName}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setValue(exampleName)}
          >
            {exampleName}
          </Button>
        ))}
      </div>
    </div>
  );
}
