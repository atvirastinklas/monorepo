"use client";

import { useState } from "react";
import {
  MapLibre,
  MapSource,
  MapLayer,
  MapPopup,
  type ExpressionSpecification,
  type FilterSpecification,
  type MapLayerMouseEvent,
} from "@workspace/map";
import { useTheme } from "next-themes";

const lithuaniaBounds = [
  [19.5, 53.2],
  [28.0, 57.2],
] as [[number, number], [number, number]];

const scopesSourceId = "mc-scopes-source";
const scopeFillLayerId = "mc-scopes-fill";
const regionMarkerSourceId = "mc-region-marker-source";

const cityRegionCodes = ["am", "em", "km", "lm", "mm", "pm", "sm", "tm", "um", "vm"];
const iataRegionCodes = ["kun", "plq", "sqq", "vno"];

const regionLabelConfigs = [
  {
    iataCode: "KUN",
    name: "Pietų Lietuva",
    coordinates: [23.80743415, 54.73676615] as [number, number],
  },
  {
    iataCode: "VNO",
    name: "Rytų Lietuva",
    coordinates: [25.6102797, 55.03610755] as [number, number],
  },
  {
    iataCode: "PLQ",
    name: "Vakarų Lietuva",
    coordinates: [22.0790954, 55.72823485] as [number, number],
  },
  {
    iataCode: "SQQ",
    name: "Šiaurės Lietuva",
    coordinates: [24.25586055, 55.9188221] as [number, number],
  },
] as const;

const regionMarkerPoints: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: regionLabelConfigs.map((region) => ({
    type: "Feature",
    properties: {
      iata_code: region.iataCode,
      name: region.name,
    },
    geometry: {
      type: "Point",
      coordinates: region.coordinates,
    },
  })),
};

const regionFillColorExpression: ExpressionSpecification = [
  "match",
  ["get", "mc:iata"],
  "kun",
  "#f59e0b",
  "vno",
  "#8b5cf6",
  "plq",
  "#06b6d4",
  "sqq",
  "#22c55e",
  "#64748b",
];

const regionAccentColorExpression: ExpressionSpecification = [
  "match",
  ["get", "mc:iata"],
  "kun",
  "#b45309",
  "vno",
  "#6d28d9",
  "plq",
  "#0f766e",
  "sqq",
  "#166534",
  "#334155",
];

const scopePolygonFilter: FilterSpecification = ["==", "$type", "Polygon"];
const scopePolygonLabelFilter: FilterSpecification = [
  "all",
  ["==", "$type", "Polygon"],
  ["!in", "mc:region", ...cityRegionCodes],
  ["!in", "mc:region", ...iataRegionCodes],
];
const scopePointLabelFilter: FilterSpecification = ["==", "$type", "Point"];

type SelectedScope = {
  displayName: string;
  latitude: number;
  longitude: number;
  scopes: string;
};

const mapStyle = (theme: string | undefined) => {
  const style = theme === "light" ? "voyager-gl-style" : "dark-matter-gl-style";
  return `https://basemaps.cartocdn.com/gl/${style}/style.json`;
};

export const NamingRegionMap = () => {
  const { theme } = useTheme();
  const isLightTheme = theme === "light";
  const [isHoveringScope, setIsHoveringScope] = useState(false);
  const [selectedScope, setSelectedScope] = useState<SelectedScope | null>(null);

  const handleScopeClick = (event: MapLayerMouseEvent) => {
    const feature = event.features?.[0];
    const properties = feature?.properties;
    const scopes = properties?.["mc:scopes"];

    if (!properties || typeof scopes !== "string") {
      return;
    }

    setSelectedScope({
      displayName: String(properties.display_name ?? "Pasirinkta sritis"),
      latitude: event.lngLat.lat,
      longitude: event.lngLat.lng,
      scopes,
    });
  };

  return (
    <div className="not-prose mb-8 rounded-2xl border bg-card/70 p-5 shadow-sm">
      <p className="mb-3 text-sm text-muted-foreground">
        Spustelėkite žemėlapio sritį, kad pamatytumėte jai nustatytiną MeshCore apimtį.
      </p>
      <div className="h-120 overflow-hidden rounded-xl border">
        <MapLibre
          initialViewState={{
            bounds: [
              [19.5, 53.2],
              [28.0, 57.2],
            ],
            fitBoundsOptions: { padding: 40 },
          }}
          maxBounds={lithuaniaBounds}
          mapStyle={mapStyle(theme)}
          interactiveLayerIds={[scopeFillLayerId]}
          cursor={isHoveringScope ? "pointer" : "grab"}
          onClick={handleScopeClick}
          onMouseMove={(event) => setIsHoveringScope(Boolean(event.features?.length))}
          onMouseLeave={() => setIsHoveringScope(false)}
        >
          <MapSource id={scopesSourceId} data="/assets/map/mc-scopes.geojson" type="geojson">
            <MapLayer
              id={scopeFillLayerId}
              type="fill"
              filter={scopePolygonFilter}
              paint={{
                "fill-color": regionFillColorExpression,
                "fill-opacity": 0.2,
              }}
            />
            <MapLayer
              id="mc-scopes-outline"
              type="line"
              filter={scopePolygonFilter}
              paint={{
                "line-color": regionAccentColorExpression,
                "line-width": 1.75,
                "line-opacity": 0.95,
              }}
            />
            <MapLayer
              id="mc-scopes-region-polygon-label"
              type="symbol"
              filter={scopePolygonLabelFilter}
              layout={{
                "text-field": "{mc:region}",
                "text-size": 13,
                "text-font": ["Open Sans Bold", "Noto Sans Regular"],
                "text-allow-overlap": true,
                "text-ignore-placement": true,
                "text-anchor": "center",
              }}
              paint={{
                "text-color": isLightTheme ? "#0f172a" : "#f8fafc",
                "text-halo-color": isLightTheme
                  ? "rgba(248, 250, 252, 0.95)"
                  : "rgba(2, 6, 23, 0.95)",
                "text-halo-width": 1.5,
              }}
            />
            <MapLayer
              id="mc-scopes-region-city-label"
              type="symbol"
              filter={scopePointLabelFilter}
              layout={{
                "text-field": "{mc:region}",
                "text-size": 13,
                "text-font": ["Open Sans Bold", "Noto Sans Regular"],
                "text-allow-overlap": true,
                "text-ignore-placement": true,
                "text-anchor": "center",
              }}
              paint={{
                "text-color": isLightTheme ? "#0f172a" : "#f8fafc",
                "text-halo-color": isLightTheme
                  ? "rgba(248, 250, 252, 0.95)"
                  : "rgba(2, 6, 23, 0.95)",
                "text-halo-width": 1.5,
              }}
            />
          </MapSource>
          <MapSource id={regionMarkerSourceId} data={regionMarkerPoints} type="geojson">
            <MapLayer
              id="mc-region-marker-iata"
              type="symbol"
              layout={{
                "text-field": "{iata_code}",
                "text-size": 24,
                "text-font": ["Open Sans Bold", "Noto Sans Regular"],
                "text-allow-overlap": true,
                "text-ignore-placement": true,
                "text-anchor": "center",
              }}
              paint={{
                "text-color": "#f8fafc",
                "text-halo-color": "rgba(2, 6, 23, 0.92)",
                "text-halo-width": 2,
              }}
            />
            <MapLayer
              id="mc-region-marker-name"
              type="symbol"
              layout={{
                "text-field": "{name}",
                "text-size": 11,
                "text-font": ["Montserrat Regular", "Open Sans Regular", "Noto Sans Regular"],
                "text-allow-overlap": true,
                "text-ignore-placement": true,
                "text-anchor": "top",
                "text-offset": [0, 2.2],
              }}
              paint={{
                "text-color": isLightTheme ? "#0f172a" : "#e2e8f0",
                "text-halo-color": isLightTheme
                  ? "rgba(248, 250, 252, 0.92)"
                  : "rgba(2, 6, 23, 0.95)",
                "text-halo-width": 1.5,
              }}
            />
          </MapSource>
          {selectedScope ? (
            <MapPopup
              longitude={selectedScope.longitude}
              latitude={selectedScope.latitude}
              anchor="bottom"
              className="scope-map-popup"
              closeOnClick={false}
              onClose={() => setSelectedScope(null)}
            >
              <div className="min-w-52 p-1 text-sm">
                <p className="font-semibold">{selectedScope.displayName}</p>
                <p className="mt-2 text-xs text-muted-foreground">Nustatykite apimtis:</p>
                <code className="mt-1 block select-all rounded-md bg-muted px-2 py-1.5 font-medium text-foreground">
                  eu {selectedScope.scopes}
                </code>
              </div>
            </MapPopup>
          ) : null}
        </MapLibre>
      </div>
    </div>
  );
};
