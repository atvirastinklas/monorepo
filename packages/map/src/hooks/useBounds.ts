import { useCallback } from "react";
import { useMapSnapshot } from "./useMapSnapshot";
import type { MapBounds, MapLibreMap } from "../types/map";

const BOUNDS_EVENTS = ["moveend"] as const;

export function useBounds(): MapBounds | null {
  const getSnapshot = useCallback(
    (map: MapLibreMap) => {
      const bounds = map.getBounds();

      return {
        west: bounds.getWest(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        north: bounds.getNorth(),
      };
    },
    [],
  );

  const isEqual = useCallback(
    (previous: MapBounds, next: MapBounds) =>
      previous.west === next.west &&
      previous.south === next.south &&
      previous.east === next.east &&
      previous.north === next.north,
    [],
  );

  return useMapSnapshot({
    events: BOUNDS_EVENTS,
    getSnapshot,
    isEqual,
  });
}
