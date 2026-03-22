"use client";

import {
  GeoJsonSource,
  MapContainer,
  MapLayer
} from "@workspace/map";

const lithuaniaBounds = [
  [19.5, 53.2],
  [28.0, 57.2],
] as [[number, number], [number, number]];

const initialOptions = {
  style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  bounds: lithuaniaBounds,
  fitBoundsOptions: {
    padding: 24,
  },
  maxBounds: lithuaniaBounds,
};

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

export const NamingRegionMap = () => {
  return (
    <MapContainer initialOptions={initialOptions} className="h-120 w-full">
      <GeoJsonSource id={regionsSourceId} data="/assets/map/mc-regions.geojson">
        <MapLayer
          id="mc-regions-fill"
          config={{
            type: "fill",
            paint: {
              "fill-color": regionFillColorExpression as any,
              "fill-opacity": 0.22,
            },
          }}
        />
        <MapLayer
          id="mc-regions-outline"
          config={{
            type: "line",
            paint: {
              "line-color": regionAccentColorExpression as any,
              "line-width": 2,
              "line-opacity": 0.95,
            },
          }}
        />
      </GeoJsonSource>
      <GeoJsonSource id={regionMarkerSourceId} data={regionMarkerPoints}>
        <MapLayer
          id="mc-region-marker-iata"
          config={{
            type: "symbol",
            layout: {
              "text-field": "{iata_code}",
              "text-size": 24,
              "text-font": ["Open Sans Bold", "Noto Sans Regular"],
              "text-allow-overlap": true,
              "text-ignore-placement": true,
              "text-anchor": "center",
            },
            paint: {
              "text-color": "#f8fafc",
              "text-halo-color": "rgba(2, 6, 23, 0.92)",
              "text-halo-width": 2,
            },
          }}
        />
        <MapLayer
          id="mc-region-marker-name"
          config={{
            type: "symbol",
            layout: {
              "text-field": "{name}",
              "text-size": 11,
              "text-font": ["Montserrat Regular", "Open Sans Regular", "Noto Sans Regular"],
              "text-allow-overlap": true,
              "text-ignore-placement": true,
              "text-anchor": "top",
              "text-offset": [0, 2.2],
            },
            paint: {
              "text-color": "#cbd5e1",
              "text-halo-color": "rgba(2, 6, 23, 0.82)",
              "text-halo-width": 4,
              "text-halo-blur": 0.5,
            },
          }}
        />
      </GeoJsonSource>
    </MapContainer>
  );
};
