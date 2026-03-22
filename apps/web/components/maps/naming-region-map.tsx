"use client";

import {
  MapLibre,
  MapSource,
  MapLayer,
} from "@workspace/map";
import { useTheme } from "next-themes";

const lithuaniaBounds = [
  [19.5, 53.2],
  [28.0, 57.2],
] as [[number, number], [number, number]];

const regionsSourceId = "mc-regions-source";
const regionMarkerSourceId = "mc-region-marker-source";

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

const regionFillColorExpression = [
  "match",
  ["get", "iata_code"],
  "KUN",
  "#f59e0b",
  "VNO",
  "#8b5cf6",
  "PLQ",
  "#06b6d4",
  "SQQ",
  "#22c55e",
  "#64748b",
];

const regionAccentColorExpression = [
  "match",
  ["get", "iata_code"],
  "KUN",
  "#b45309",
  "VNO",
  "#6d28d9",
  "PLQ",
  "#0f766e",
  "SQQ",
  "#166534",
  "#334155",
];

const mapStyle = (theme: string | undefined) => {
  const style = theme === "light" ? "voyager-gl-style" : "dark-matter-gl-style";
  return `https://basemaps.cartocdn.com/gl/${style}/style.json`;
};

export const NamingRegionMap = () => {
  const { theme } = useTheme();
  const isLightTheme = theme === "light";

  return (
    <div className="flex-1 h-120">
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
      >
        <MapSource id={regionsSourceId} data="/assets/map/mc-regions.geojson" type="geojson">
          <MapLayer
            id="mc-regions-fill"
            type="fill"
            paint={{
              "fill-color": regionFillColorExpression as any,
              "fill-opacity": 0.22,
            }}
          />
          <MapLayer
            id="mc-regions-outline"
            type="line"
            paint={{
              "line-color": regionAccentColorExpression as any,
              "line-width": 2,
              "line-opacity": 0.95,
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
              "text-halo-color": isLightTheme ? "rgba(248, 250, 252, 0.92)" : "rgba(2, 6, 23, 0.95)",
              "text-halo-width": 1.5,
            }}
          />
        </MapSource>
      </MapLibre>
    </div>
  );
};
