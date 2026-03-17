import type { Map as MapLibreMap, MapEventType, MapOptions } from "maplibre-gl";
import type { RefObject } from "react";

export type MapCoordinates = {
  lng: number;
  lat: number;
};

export type MapBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export type MapSnapshotEventName = keyof MapEventType;

export type MapSnapshotOptions = {
  live?: boolean;
};

export type MapProviderInitialOptions = Omit<MapOptions, "container">;

export type MapContextValue = {
  mapRef: RefObject<MapLibreMap | null>;
  getMap: () => MapLibreMap | null;
};

export type { MapLibreMap };
