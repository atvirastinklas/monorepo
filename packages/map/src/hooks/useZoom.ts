import { useCallback } from "react";
import { useMapSnapshot } from "./useMapSnapshot";
import type { MapLibreMap } from "../types/map";

const ZOOM_EVENTS = ["zoomend"] as const;

export function useZoom(): number | null {
  const getSnapshot = useCallback((map: MapLibreMap) => map.getZoom(), []);

  return useMapSnapshot({
    events: ZOOM_EVENTS,
    getSnapshot,
  });
}
